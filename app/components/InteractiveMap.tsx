import React, { useEffect, useState, useRef, useMemo } from 'react';
// Leaflet CSS is now imported globally in root.tsx
import L from 'leaflet'; // Import Leaflet library
import useGeoCoding from '~/hooks/useGeoCoding'; // Adjusted import path
import { kmlZones } from '~/utils/kmlZones'; // Adjusted import path
import type { SapTicket } from '~/types/firestore.types'; // Import SapTicket type
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons';

// Interface for props, using SapTicket now
interface InteractiveMapProps {
  tickets: SapTicket[];
  isLoadingTickets: boolean; // Pass loading state for tickets
}

// Zone colors mapping by name (matches kmlZones properties.name)
const zoneColorMap: { [key: string]: L.PathOptions } = {
  'Baptiste': { color: '#FFEA00', weight: 2, fillColor: '#FFEA00', fillOpacity: 0.3 }, // Yellow
  'julien Isère': { color: '#000000', weight: 2, fillColor: '#000000', fillOpacity: 0.3 }, // Black
  'Julien': { color: '#097138', weight: 2, fillColor: '#097138', fillOpacity: 0.3 }, // Green
  'Florian': { color: '#E65100', weight: 2, fillColor: '#E65100', fillOpacity: 0.3 }, // Orange
  'Matthieu': { color: '#9C27B0', weight: 2, fillColor: '#9C27B0', fillOpacity: 0.3 }, // Purple
  'Guillem': { color: '#9FA8DA', weight: 2, fillColor: '#9FA8DA', fillOpacity: 0.3 }, // Light Purple/Blue
};

// Default style for zones without a specific color
const defaultZoneStyle: L.PathOptions = {
  color: '#3388ff', // Default Leaflet blue
  weight: 2,
  fillColor: '#3388ff',
  fillOpacity: 0.3,
};

// Create a circular marker icon function using DivIcon
const createCircleMarker = (color: string = '#3388ff') => {
  return L.divIcon({
    className: 'custom-div-icon', // Can add custom CSS rules for this class if needed
    html: `<div style="background-color:${color}; width:15px; height:15px; border-radius:50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [15, 15], // Size of the icon
    iconAnchor: [7, 7], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -7] // Point from which the popup should open relative to the iconAnchor
  });
};

// Marker color based on ticket status
const getMarkerColor = (status?: string): string => {
    if (!status) return '#808080'; // Grey for undefined status
    const statusLower = status.toLowerCase();
    if (statusLower.includes('en cours')) return '#FFA500'; // Orange
    if (statusLower.includes('fermé')) return '#4CAF50'; // Green (Changed from 'terminé')
    if (statusLower.includes('annulé')) return '#F44336'; // Red
    if (statusLower.includes('demande de rma')) return '#9C27B0'; // Purple
    if (statusLower.includes('nouveau')) return '#2196F3'; // Blue
    if (statusLower.includes('ouvert')) return '#FFEB3B'; // Yellow for Ouvert
    return '#808080'; // Default grey for other statuses
};

// Normalize address function (can be moved to utils if used elsewhere)
const normalizeAddress = (address: string): string => {
    return address.trim().toLowerCase().replace(/\s+/g, ' ');
};


const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets, isLoadingTickets }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null); // Use LayerGroup for markers
  const zonesLayerRef = useRef<L.GeoJSON | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 1. Extract unique, valid addresses from tickets using useMemo
  const uniqueAddresses = useMemo(() => {
    console.log("[InteractiveMap] Recalculating unique addresses...");
    if (!Array.isArray(tickets)) return [];
    const addresses = tickets
      .map(ticket => ticket.adresse)
      .filter((addr): addr is string => typeof addr === 'string' && addr.trim() !== ''); // Type guard and check for non-empty
    // No need to normalize here, the hook does it internally for map keys
    const uniqueSet = new Set(addresses);
    console.log(`[InteractiveMap] Found ${uniqueSet.size} unique addresses.`);
    return Array.from(uniqueSet);
  }, [tickets]); // Recalculate only when tickets array changes

  // 2. Use the useGeoCoding hook with the array of addresses
  const { coordinates: geocodedCoordinates, isLoading: isGeocoding, error: geocodingError } = useGeoCoding(uniqueAddresses);

  // Initialize map
  useEffect(() => {
    // Ensure Leaflet is loaded and container exists
    if (!mapContainerRef.current || !L) {
        console.log("[InteractiveMap] Skipping map init: Container or Leaflet not ready.");
        return;
    }
    // Prevent re-initialization
    if (mapRef.current) {
        console.log("[InteractiveMap] Skipping map init: Map already initialized.");
        return;
    }

    console.log("[InteractiveMap] Initializing map...");
    if (mapContainerRef.current) {
        console.log(`[InteractiveMap] Container dimensions before init: ${mapContainerRef.current.offsetWidth}x${mapContainerRef.current.offsetHeight}`);
    } else {
         console.log("[InteractiveMap] mapContainerRef.current is null before init!");
         return;
    }
    if (mapContainerRef.current.offsetHeight === 0) {
        console.warn("[InteractiveMap] Map container has zero height before initialization. Map might not render correctly.");
    }

    let map: L.Map | null = null;
    let timerId: NodeJS.Timeout | null = null;

    try {
        map = L.map(mapContainerRef.current).setView([46.2276, 2.2137], 6); // Center on France

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);

        const zonesLayer = L.geoJSON([], {
          style: (feature) => {
            if (feature?.properties?.name) {
              return zoneColorMap[feature.properties.name] || defaultZoneStyle;
            }
            return defaultZoneStyle;
          },
          onEachFeature: (feature, layer) => {
            if (feature?.properties?.name) {
              layer.bindPopup(`<b>Secteur:</b> ${feature.properties.name}`);
              layer.on({
                mouseover: (e) => e.target.setStyle({ weight: 4, fillOpacity: 0.5 }),
                mouseout: (e) => zonesLayer.resetStyle(e.target),
              });
            }
          }
        });

        kmlZones.forEach(zone => {
          zonesLayer.addData(zone.feature);
        });

        zonesLayer.addTo(map);
        zonesLayerRef.current = zonesLayer;

        if (zonesLayer.getBounds().isValid()) {
          map.fitBounds(zonesLayer.getBounds().pad(0.1));
        }

        setMapReady(true);
        console.log("[InteractiveMap] Map initialized successfully.");

        timerId = setTimeout(() => {
            if (mapRef.current && mapContainerRef.current) {
                console.log("[InteractiveMap] Calling invalidateSize() via setTimeout...");
                console.log(`[InteractiveMap] Container dimensions before invalidateSize: ${mapContainerRef.current.offsetWidth}x${mapContainerRef.current.offsetHeight}`);
                mapRef.current.invalidateSize();
                console.log("[InteractiveMap] Map size invalidated.");
                console.log(`[InteractiveMap] Container dimensions after invalidateSize: ${mapContainerRef.current.offsetWidth}x${mapContainerRef.current.offsetHeight}`);
            } else {
                 console.log("[InteractiveMap] mapRef or mapContainerRef is null in setTimeout, cannot invalidate size.");
            }
        }, 100);


    } catch (error: any) {
        console.error("[InteractiveMap] Error initializing map:", error);
        setMapError(`Erreur d'initialisation de la carte: ${error.message}`);
        setMapReady(false);
    }


    return () => {
      console.log("[InteractiveMap] Cleaning up map");
      if (timerId) {
          clearTimeout(timerId);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        zonesLayerRef.current = null;
        setMapReady(false);
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Update markers when map is ready, tickets change, or geocoding results change
  useEffect(() => {
    // Wait for map, Leaflet, marker layer. Geocoding runs in parallel.
    if (!mapReady || !L || !mapRef.current || !markersLayerRef.current) {
        // console.log(`[InteractiveMap] Skipping marker update. MapReady: ${mapReady}, L: ${!!L}, MapRef: ${!!mapRef.current}, MarkersLayer: ${!!markersLayerRef.current}`);
        return;
    }

    // Don't wait for geocoding to finish entirely, update markers as coordinates become available
    console.log(`[InteractiveMap] Updating markers. ${tickets.length} tickets received. ${geocodedCoordinates.size} addresses geocoded/cached.`);

    markersLayerRef.current.clearLayers();
    const addedMarkers: L.Marker[] = [];

    if (!Array.isArray(tickets)) {
        console.warn("[InteractiveMap] Tickets data is not an array.");
        return;
    }

    for (const ticket of tickets) {
      const originalAddress = ticket.adresse; // Keep original for display
      if (!originalAddress || typeof originalAddress !== 'string' || originalAddress.trim() === '') continue;

      const normalizedAddr = normalizeAddress(originalAddress); // Use normalized for lookup

      try {
        // Get coordinates from the hook's result map
        const coordinates = geocodedCoordinates.get(normalizedAddr);

        // Add marker ONLY if coordinates are available (not null/undefined)
        if (coordinates && mapRef.current) {
          const markerColor = getMarkerColor(ticket.statut);
          const circleIcon = createCircleMarker(markerColor);

          const marker = L.marker([coordinates.lat, coordinates.lng], { icon: circleIcon })
            .bindPopup(`<b>${ticket.raisonSociale || 'Client inconnu'}</b><br/>${originalAddress}<br/>Statut: ${ticket.statut || 'Non défini'}<br/>ID: ${ticket.id}`);

          addedMarkers.push(marker);
        } else if (geocodedCoordinates.has(normalizedAddr) && coordinates === null) {
          // Address was processed by geocoder but resulted in null (not found)
          // console.warn(`[InteractiveMap] No coordinates found for address (geocoding failed): ${originalAddress}`);
        } else if (!geocodedCoordinates.has(normalizedAddr)) {
           // Address not yet processed by geocoder or still loading
           // console.log(`[InteractiveMap] Coordinates not yet available for: ${originalAddress}`);
        }
      } catch (error: any) {
        console.error(`[InteractiveMap] Error creating marker for ticket ${ticket.id} at address "${originalAddress}":`, error.message);
      }
    }

    // Add all new markers to the layer group at once
    if (markersLayerRef.current && addedMarkers.length > 0) {
        addedMarkers.forEach(marker => markersLayerRef.current?.addLayer(marker));
    }

    console.log(`[InteractiveMap] Added ${addedMarkers.length} markers to map.`);

  // Update whenever tickets change OR the geocoded coordinates map changes.
  // isGeocoding is removed as a dependency because we want to render markers
  // as soon as their coordinates are available, not wait for the whole batch.
  }, [tickets, mapReady, geocodedCoordinates]);

  // Handle geocoding errors specifically
  useEffect(() => {
    if (geocodingError) {
      console.error("[InteractiveMap] Geocoding Error:", geocodingError);
      // Display a more user-friendly message, potentially combining with mapError
      setMapError(prev => prev ? `${prev} | Erreur Géocodage: ${geocodingError}` : `Erreur Géocodage: ${geocodingError}`);
    } else {
      // Clear only geocoding-related errors if resolved
      if (mapError?.includes('Géocodage')) {
         const otherErrors = mapError.replace(/\|? Erreur Géocodage:.*?($|\|)/, '').trim();
         setMapError(otherErrors || null);
      }
    }
  }, [geocodingError, mapError]); // Add mapError dependency


  return (
    <div className="bg-jdc-card p-4 rounded-lg shadow-lg relative min-h-[450px]"> {/* Ensure container has background and min height */}
       <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
            <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-jdc-yellow" />
            Carte des Tickets Récents
       </h2>

       {/* Loading and Error Overlays */}
       {/* Show spinner if tickets are loading OR if geocoding is in progress for the first time */}
       {(isLoadingTickets || (isGeocoding && geocodedCoordinates.size === 0 && uniqueAddresses.length > 0)) && (
         <div className="absolute inset-0 z-[500] flex items-center justify-center bg-jdc-card bg-opacity-75 rounded-lg">
           <FontAwesomeIcon icon={faSpinner} spin className="text-jdc-yellow text-3xl mr-2" />
           <span className="text-white">
             {isLoadingTickets ? "Chargement des tickets..." : "Géocodage des adresses..."}
            </span>
         </div>
       )}
       {/* Show geocoding spinner subtly if map is ready but still geocoding some addresses */}
        {mapReady && isGeocoding && !isLoadingTickets && (
             <div className="absolute top-16 right-4 z-[1000] text-jdc-yellow" title="Géocodage en cours...">
                 <FontAwesomeIcon icon={faSpinner} spin />
             </div>
        )}
       {mapError && !isLoadingTickets && !isGeocoding && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-800 text-white px-4 py-2 rounded text-sm shadow-lg flex items-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {mapError}
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-[400px] rounded-lg ${ (isLoadingTickets || (isGeocoding && geocodedCoordinates.size === 0 && uniqueAddresses.length > 0)) ? 'opacity-50' : ''}`}
        style={{ backgroundColor: '#4a4a4a' }} // Darker background for the map area itself
      >
        {/* Placeholder text if map fails to initialize */}
        {!mapReady && !mapError && !isLoadingTickets && !isGeocoding && (
            <div className="flex items-center justify-center h-full text-jdc-gray-400">
                Initialisation de la carte...
            </div>
        )}
      </div>

    </div>
  );
};

export default InteractiveMap;
