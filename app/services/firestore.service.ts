import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy, // Keep import, might be used elsewhere
  getCountFromServer,
  Timestamp,
  doc,
  getDoc,
  setDoc, // Import setDoc for writing cache
  serverTimestamp, // Import serverTimestamp
  collectionGroup // Import collectionGroup for potential future use
} from "firebase/firestore";
import type { SapTicket, Shipment, StatsSnapshot, UserProfile, GeocodeCacheEntry } from "~/types/firestore.types"; // Added GeocodeCacheEntry
import { app as firebaseApp } from "~/firebase.config"; // Use aliased import
import { getAuth } from "firebase/auth"; // Needed to potentially get current user

const db = getFirestore(firebaseApp);
const TICKET_SECTORS = ['CHR', 'HACCP', 'Kezia', 'Tabac']; // Define valid sectors
const GEOCODE_COLLECTION = "geocodes"; // Define collection name for geocoding cache
const GEOCODE_CACHE_EXPIRY_DAYS = 30; // Cache expiry in days (optional)
const SHIPMENT_COLLECTION = "Envoi"; // Define shipment collection name

// --- Helper Functions ---

// Updated to include sector source
function docToSapTicket(docId: string, data: any, sector: string): SapTicket {
  return {
    id: docId,
    ...data,
    date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
    secteur: sector, // Assign sector based on the collection queried
  } as SapTicket;
}

function docToShipment(docId: string, data: any): Shipment {
  // Assumes 'secteur' field exists within the Envoi document data itself
  // The rules already rely on this field for access control.
  return {
    id: docId,
    ...data,
    // Ensure dateCreation is converted if it's a Timestamp (handle if it might exist later)
    dateCreation: data.dateCreation instanceof Timestamp ? data.dateCreation.toDate() : data.dateCreation, // Keep conversion logic just in case
    secteur: data.secteur || 'Inconnu', // Fallback if missing, though rules might prevent access
  } as Shipment;
}

function docToStatsSnapshot(docId: string, data: any): StatsSnapshot {
  return {
    id: docId,
    ...data,
    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
  } as StatsSnapshot;
}

// --- User Profile Fetching (Example - might live elsewhere) ---
// Helper to get user profile data, including sectors
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log("[SDK] User profile fetched for:", userId);
      // Ensure the data conforms to UserProfile, especially 'secteurs'
      const data = userDocSnap.data();
      const profile: UserProfile = {
        uid: userId,
        email: data.email ?? '', // Provide default empty string if missing
        role: data.role ?? 'Technician', // Provide default role if missing
        secteurs: Array.isArray(data.secteurs) ? data.secteurs : [], // Ensure secteurs is an array
        displayName: data.displayName, // Optional
      };
      return profile;
    } else {
      console.warn("[SDK] No user profile found for:", userId);
      return null;
    }
  } catch (error) {
    console.error("[SDK] Error fetching user profile:", error);
    return null;
  }
};


// --- SDK-based Data Fetching Functions (Adapted for sectors) ---

// Get total count of tickets from accessible sector collections
export const getTotalTicketCountSdk = async (userSectors: string[]): Promise<number | null> => {
  // Ensure userSectors is an array before using .includes
  if (!Array.isArray(userSectors)) {
    console.error("[SDK] getTotalTicketCountSdk: userSectors is not an array.", userSectors);
    return null; // Or 0, depending on desired behavior
  }
  try {
    // Determine which collections to query based on userSectors
    const accessibleSectors = TICKET_SECTORS.filter(sector => userSectors.includes(sector));
    if (accessibleSectors.length === 0) {
        console.log("[SDK] User has no access to any ticket sectors.");
        return 0; // Or null, depending on desired behavior
    }

    // Create count queries for each accessible sector
    const countPromises = accessibleSectors.map(sector => {
      const collRef = collection(db, sector);
      return getCountFromServer(collRef);
    });

    // Execute queries in parallel and sum the results
    const snapshots = await Promise.all(countPromises);
    const totalCount = snapshots.reduce((sum, snapshot) => sum + snapshot.data().count, 0);

    console.log(`[SDK] Total ticket count fetched from sectors [${accessibleSectors.join(', ')}]:`, totalCount);
    return totalCount;
  } catch (error) {
    console.error("[SDK] Error getting total ticket count across sectors:", error);
    // Consider partial results or specific error handling if needed
    return null;
  }
};

// Get count of active shipments from 'Envoi' collection
// Firestore rules handle sector filtering based on resource.data.secteur
export const getActiveShipmentCountSdk = async (): Promise<number | null> => {
  try {
    const collRef = collection(db, SHIPMENT_COLLECTION);
    // Query for documents where statutExpedition is NOT "OUI"
    const q = query(collRef, where("statutExpedition", "!=", "OUI")); // Query for not equal to "OUI"

    const snapshot = await getCountFromServer(q);
    const totalCount = snapshot.data().count;

    console.log(`[SDK] Active shipment count (Envoi, statutExpedition != 'OUI', filtered by rules) fetched:`, totalCount);
    return totalCount;
  } catch (error) {
    // Errors here might indicate permission issues if rules are misconfigured or user lacks access
    console.error("[SDK] Error getting active shipment count from Envoi (check rules/permissions):", error);
    return null;
  }
};


// Get count of distinct active clients from 'Envoi' (INEFFICIENT)
// Firestore rules handle sector filtering based on resource.data.secteur
export const getActiveClientCountInefficientSdk = async (): Promise<number | null> => {
  const activeClients = new Set<string>();
  try {
    const collRef = collection(db, SHIPMENT_COLLECTION);
    // Fetch documents potentially filtered by rules and then check status client-side.
    const q = query(collRef, where("statutExpedition", "!=", "OUI")); // Fetch docs not marked "OUI"

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Firestore rules should ensure we only get docs the user can access
        // Double-check status client-side (redundant if query is perfect, safe otherwise)
        if (data.statutExpedition !== 'OUI') {
            if (data.codeClient) {
              activeClients.add(data.codeClient);
            } else if (data.nomClient) {
               activeClients.add(data.nomClient); // Fallback to name
            }
        }
    });

    console.log(`[SDK] Active client count (Envoi, inefficient, filtered by rules) fetched:`, activeClients.size);
    return activeClients.size;
  } catch (error) {
    console.error("[SDK] Error getting active client count from Envoi (check rules/permissions):", error);
    return null;
  }
};


// Get recent tickets from accessible sector collections
export const getRecentTicketsSdk = async (count: number, userSectors: string[]): Promise<SapTicket[]> => {
  // Ensure userSectors is an array before using .includes
  if (!Array.isArray(userSectors)) {
    console.error("[SDK] getRecentTicketsSdk: userSectors is not an array.", userSectors);
    // Return empty array if sectors are invalid/missing, as the user likely has no access anyway
    return [];
  }
  try {
    // Filter TICKET_SECTORS based on the provided userSectors
    const accessibleSectors = TICKET_SECTORS.filter(sector => userSectors.includes(sector));
    if (accessibleSectors.length === 0) {
        console.log("[SDK] User has no access to any ticket sectors for recent tickets based on profile.");
        return [];
    }

    // Create fetch queries for each accessible sector
    const fetchPromises = accessibleSectors.map(sector => {
      const collRef = collection(db, sector);
      // Assuming 'date' field exists for ordering
      const q = query(collRef, orderBy("date", "desc"), limit(count)); // Fetch 'count' from each sector initially
      return getDocs(q).then(snapshot => ({ sector, snapshot })); // Return sector name with snapshot
    });

    // Execute queries in parallel
    const results = await Promise.all(fetchPromises);

    // Merge results and convert docs
    let allTickets: SapTicket[] = [];
    results.forEach(({ sector, snapshot }) => {
      snapshot.forEach((doc) => {
        allTickets.push(docToSapTicket(doc.id, doc.data(), sector)); // Pass sector to helper
      });
    });

    // Sort all collected tickets by date (descending)
    allTickets.sort((a, b) => {
        // Handle potential non-Date values gracefully
        const dateA = a.date instanceof Date ? a.date.getTime() : (a.date instanceof Timestamp ? a.date.toMillis() : 0);
        const dateB = b.date instanceof Date ? b.date.getTime() : (b.date instanceof Timestamp ? b.date.toMillis() : 0);
        return dateB - dateA; // Descending order
    });

    // Limit to the final desired count
    const recentTickets = allTickets.slice(0, count);

    console.log(`[SDK] Fetched ${recentTickets.length} recent tickets from sectors [${accessibleSectors.join(', ')}].`);
    return recentTickets;

  } catch (error) {
    // Catch potential errors during query execution or processing
    console.error("[SDK] Error getting recent tickets across sectors:", error);
    return []; // Return empty array on error
  }
};

// Get recent shipments from 'Envoi'
// Firestore rules handle sector filtering based on resource.data.secteur
// REMOVED: orderBy("dateCreation", "desc") because the field is missing in documents
export const getRecentShipmentsSdk = async (count: number): Promise<Shipment[]> => {
   try {
     const collRef = collection(db, SHIPMENT_COLLECTION);
     // Fetch documents, relying on rules for filtering. Limit the count.
     // No ordering applied here due to missing dateCreation field.
     const q = query(collRef, limit(count));
     const querySnapshot = await getDocs(q);

     const recentShipments: Shipment[] = [];
     querySnapshot.forEach((doc) => {
       // Firestore rules ensure we only get docs the user can access
       recentShipments.push(docToShipment(doc.id, doc.data()));
     });

     console.log(`[SDK] Fetched ${recentShipments.length} recent shipments from Envoi (filtered by rules, no date sorting).`);
     // Note: The order is not guaranteed without orderBy.
     return recentShipments;

   } catch (error) {
     console.error("[SDK] Error getting recent shipments from Envoi (check rules/permissions):", error);
     return [];
   }
};

/**
 * Fetches ALL shipments from the 'Envoi' collection accessible by the current user.
 * Firestore rules are expected to filter based on the user's allowed sectors
 * by checking the 'secteur' field within each shipment document.
 * REMOVED: orderBy("dateCreation", "desc") because the field is missing in documents
 * @returns Promise<Shipment[]> An array of all accessible shipments.
 */
export const getAllShipmentsSdk = async (): Promise<Shipment[]> => {
  try {
    const collRef = collection(db, SHIPMENT_COLLECTION);
    // No specific query constraints here, rely on Firestore rules for filtering.
    // No ordering applied here due to missing dateCreation field.
    const q = query(collRef);
    const querySnapshot = await getDocs(q);

    const allShipments: Shipment[] = [];
    querySnapshot.forEach((doc) => {
      // Firestore rules should ensure we only get docs the user can access.
      allShipments.push(docToShipment(doc.id, doc.data()));
    });

    console.log(`[SDK] Fetched ${allShipments.length} total shipments from Envoi (filtered by rules, no date sorting).`);
    // Note: The order is not guaranteed without orderBy.
    // Consider client-side sorting if needed, e.g., by client name:
    // allShipments.sort((a, b) => (a.nomClient || '').localeCompare(b.nomClient || ''));
    return allShipments;

  } catch (error) {
    // Errors might indicate permission issues if rules are misconfigured or user lacks access.
    console.error("[SDK] Error getting all shipments from Envoi (check rules/permissions):", error);
    return []; // Return empty array on error
  }
};


// Get the latest N stats snapshots from 'dailyStatsSnapshots'
// Modified to accept a count parameter
export const getLatestStatsSnapshotsSdk = async (count: number = 1): Promise<StatsSnapshot[]> => {
  try {
    const collRef = collection(db, "dailyStatsSnapshots");
    const q = query(collRef, orderBy("timestamp", "desc"), limit(count));
    const querySnapshot = await getDocs(q);

    const snapshots: StatsSnapshot[] = [];
    querySnapshot.forEach((doc) => {
      snapshots.push(docToStatsSnapshot(doc.id, doc.data()));
    });

    console.log(`[SDK] Fetched ${snapshots.length} latest stats snapshots (requested ${count}).`);
    return snapshots; // Ordered newest first
  } catch (error) {
    console.error(`[SDK] Error getting latest ${count} stats snapshots:`, error);
    return [];
  }
};

// --- Geocoding Cache Functions ---

/**
 * Fetches a geocode entry from the Firestore cache.
 * Checks for expiry if GEOCODE_CACHE_EXPIRY_DAYS is set.
 * @param normalizedAddress The address string, normalized (e.g., lowercase, trimmed).
 * @returns The cached entry or null if not found, expired, or error.
 */
export const fetchGeocode = async (normalizedAddress: string): Promise<GeocodeCacheEntry | null> => {
  if (!normalizedAddress) return null;
  try {
    const docRef = doc(db, GEOCODE_COLLECTION, normalizedAddress);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as GeocodeCacheEntry;

      // Optional: Check for cache expiry
      if (GEOCODE_CACHE_EXPIRY_DAYS > 0 && data.timestamp instanceof Timestamp) {
        const now = new Date();
        const expiryDate = new Date(data.timestamp.toDate());
        expiryDate.setDate(expiryDate.getDate() + GEOCODE_CACHE_EXPIRY_DAYS);

        if (now > expiryDate) {
          console.log(`[SDK] Geocode cache expired for: "${normalizedAddress}"`);
          // Optionally delete the expired entry here: await deleteDoc(docRef);
          return null; // Treat as cache miss
        }
      }

      console.log(`[SDK] Geocode cache hit for: "${normalizedAddress}"`);
      return data;
    } else {
      console.log(`[SDK] Geocode cache miss for: "${normalizedAddress}"`);
      return null;
    }
  } catch (error) {
    console.error(`[SDK] Error fetching geocode cache for "${normalizedAddress}":`, error);
    return null; // Return null on error to trigger API lookup
  }
};

/**
 * Stores a geocode result in the Firestore cache.
 * Uses the normalized address as the document ID.
 * @param normalizedAddress The address string, normalized.
 * @param latitude The latitude.
 * @param longitude The longitude.
 * @returns Promise<void>
 */
export const storeGeocode = async (normalizedAddress: string, latitude: number, longitude: number): Promise<void> => {
   if (!normalizedAddress) return;
   try {
     const docRef = doc(db, GEOCODE_COLLECTION, normalizedAddress);
     const data: GeocodeCacheEntry = {
       latitude,
       longitude,
       timestamp: serverTimestamp() // Use server timestamp for consistency
     };
     // Use setDoc with merge: true if you want to update timestamp without overwriting other fields if they existed
     // await setDoc(docRef, data, { merge: true });
     await setDoc(docRef, data); // Overwrites existing doc, which is fine for this cache use case
     console.log(`[SDK] Stored geocode cache for: "${normalizedAddress}"`);
   } catch (error) {
     console.error(`[SDK] Error storing geocode cache for "${normalizedAddress}":`, error);
     // Decide if you want to re-throw or just log
   }
};
