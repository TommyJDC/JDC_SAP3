import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { fetchGeocode, storeGeocode } from '~/services/firestore.service';
import type { GeocodeCacheEntry } from '~/types/firestore.types';

// API response interfaces (remain the same)
interface OpenCageResult {
  geometry: { lat: number; lng: number };
  formatted: string;
}
interface OpenCageResponse {
  results: OpenCageResult[];
  status: { code: number; message: string };
}

// Type for individual geocode result (lat/lng or null if not found)
type Coordinates = { lat: number; lng: number } | null;

// Return type of the hook
interface UseGeoCodingResult {
  coordinates: Map<string, Coordinates>; // Map from normalized address to Coordinates
  isLoading: boolean;
  error: string | null;
}

// Normalize address (remains the same)
const normalizeAddress = (address: string): string => {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
};

const useGeoCoding = (addresses: string[]): UseGeoCodingResult => {
  const [coordinatesMap, setCoordinatesMap] = useState<Map<string, Coordinates>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Hardcoded API Key
  const apiKey = "b93a76ecb4b0439dbfe9e64c3c6aff07";
  // Keep track of addresses currently being processed to avoid duplicate requests
  const processingRef = useRef<Set<string>>(new Set());

  // Stable string representation of addresses for useEffect dependency
  const addressesKey = JSON.stringify(addresses.slice().sort());

  useEffect(() => {
    // Abort controller for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    const geocodeBatch = async () => {
      if (!addresses || addresses.length === 0) {
        setCoordinatesMap(new Map()); // Clear map if no addresses
        setIsLoading(false);
        setError(null);
        processingRef.current.clear();
        return;
      }

      if (!apiKey) {
        // This check is less critical now but kept for structure
        console.error("OpenCage API Key is missing (hardcoded value)");
        setError('API Key missing');
        setIsLoading(false);
        return;
      }

      // Identify new addresses to geocode
      const addressesToFetch: string[] = [];
      const currentProcessing = new Set<string>(); // Track for this specific batch run

      addresses.forEach(addr => {
        if (!addr) return;
        const normalizedAddr = normalizeAddress(addr);
        // Only process if not already fetched and not currently being processed
        if (!coordinatesMap.has(normalizedAddr) && !processingRef.current.has(normalizedAddr)) {
          addressesToFetch.push(addr); // Use original address for API call
          processingRef.current.add(normalizedAddr); // Mark as processing globally
          currentProcessing.add(normalizedAddr); // Mark for this batch
        }
      });

      if (addressesToFetch.length === 0) {
        // No new addresses to fetch, ensure loading is false
        setIsLoading(false);
        // Clear processing flags for addresses no longer in the input list
        const currentNormalizedAddresses = new Set(addresses.map(normalizeAddress));
        processingRef.current.forEach(addr => {
            if (!currentNormalizedAddresses.has(addr)) {
                processingRef.current.delete(addr);
            }
        });
        return; // Nothing new to do
      }

      console.log(`[useGeoCoding] Batch geocoding ${addressesToFetch.length} new addresses.`);
      setIsLoading(true);
      setError(null); // Clear previous errors

      const promises = addressesToFetch.map(async (addr): Promise<[string, Coordinates]> => {
        const normalizedAddr = normalizeAddress(addr);
        try {
          // 1. Check Firestore Cache
          console.log(`[useGeoCoding] Checking cache for: "${normalizedAddr}"`);
          const cachedData = await fetchGeocode(normalizedAddr);
          if (cachedData) {
            console.log(`[useGeoCoding] Cache hit for "${normalizedAddr}"`);
            return [normalizedAddr, { lat: cachedData.latitude, lng: cachedData.longitude }];
          }

          // 2. Cache miss - Call OpenCageData API
          if (signal.aborted) throw new Error('Request aborted'); // Check before API call
          console.log(`[useGeoCoding] Cache miss. Calling OpenCage API for: "${addr}"`);
          const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(addr)}&key=${apiKey}&language=fr&pretty=1`;
          const response = await axios.get<OpenCageResponse>(url, { signal }); // Pass signal

          if (signal.aborted) throw new Error('Request aborted'); // Check after API call

          if (response.data?.results?.length > 0) {
            const { lat, lng } = response.data.results[0].geometry;
            console.log(`[useGeoCoding] Geocoded "${addr}" to:`, { lat, lng });
            // 3. Store result in Firestore Cache (async, don't wait)
            storeGeocode(normalizedAddr, lat, lng).catch(cacheErr => {
              console.error(`[useGeoCoding] Error storing geocode cache for "${normalizedAddr}":`, cacheErr);
            });
            return [normalizedAddr, { lat, lng }];
          } else {
            console.warn(`[useGeoCoding] No results found for address: "${addr}"`);
            // Store null in cache to avoid re-querying? Optional.
            // await storeGeocode(normalizedAddr, null, null); // Example if storing nulls
            return [normalizedAddr, null]; // Indicate not found
          }
        } catch (err: any) {
          if (axios.isCancel(err) || (err.message && err.message.includes('aborted'))) {
             console.log(`[useGeoCoding] Geocode request aborted for "${addr}"`);
             // Don't set global error for aborts
             return [normalizedAddr, undefined]; // Indicate aborted/retry needed maybe? Or just skip update.
          }
          console.error(`[useGeoCoding] Error geocoding address "${addr}":`, err);
          // Handle specific API errors like before
          let errorMessage = 'Erreur de géocodage';
           if (axios.isAxiosError(err)) {
             if (err.response) {
               errorMessage = `Erreur API (${err.response.status}): ${err.response.data?.status?.message || 'Erreur inconnue'}`;
               if (err.response.status === 401 || err.response.status === 403) errorMessage = 'Clé API invalide';
               else if (err.response.status === 402) errorMessage = 'Quota API dépassé';
             } else if (err.request) {
               errorMessage = 'Pas de réponse du serveur';
             }
           }
          setError(prev => prev ? `${prev} | ${errorMessage}` : errorMessage); // Append errors
          return [normalizedAddr, null]; // Indicate error/not found
        }
      });

      // Wait for all promises to settle
      const results = await Promise.allSettled(promises);

      // Update state only if the component hasn't been unmounted or effect re-run
      if (!signal.aborted) {
        setCoordinatesMap(prevMap => {
          const newMap = new Map(prevMap);
          results.forEach(result => {
            if (result.status === 'fulfilled' && result.value && result.value[1] !== undefined) {
              const [normalizedAddr, coords] = result.value;
              newMap.set(normalizedAddr, coords);
            } else if (result.status === 'rejected') {
              // Error already logged and potentially set in state within the promise
              console.error("[useGeoCoding] Promise rejected:", result.reason);
            }
            // Remove processed addresses from the processing ref
            if (result.status === 'fulfilled' && result.value) {
                 processingRef.current.delete(result.value[0]);
            } else {
                 // Need to figure out which address failed if rejected, might need more complex error handling
                 // For now, assume it's removed from processing if promise settled
                 // This part needs refinement if precise tracking on failure is needed
            }
          });
           // Clean up processingRef for addresses no longer in the input list
           const currentNormalizedAddresses = new Set(addresses.map(normalizeAddress));
           processingRef.current.forEach(addr => {
               if (!currentNormalizedAddresses.has(addr)) {
                   processingRef.current.delete(addr);
               }
           });
          return newMap;
        });
        setIsLoading(false);
      } else {
         console.log("[useGeoCoding] Effect aborted, skipping state update.");
      }

       // Ensure addresses processed in this batch are removed from processingRef if effect aborted mid-flight
       if (signal.aborted) {
           currentProcessing.forEach(addr => processingRef.current.delete(addr));
       }

    };

    geocodeBatch();

    // Cleanup function
    return () => {
      console.log("[useGeoCoding] Cleanup effect");
      abortController.abort(); // Abort ongoing Axios requests
      // Clear processing flags for addresses handled by this effect instance
      // Note: This might be tricky if multiple effects run concurrently,
      // but processingRef helps manage this across renders.
      // addresses.forEach(addr => {
      //    if (addr) processingRef.current.delete(normalizeAddress(addr));
      // });
    };
    // Use stable key derived from addresses array
  }, [addressesKey, apiKey]); // Rerun when addresses or apiKey change

  return { coordinates: coordinatesMap, isLoading: error };
};

export default useGeoCoding;
