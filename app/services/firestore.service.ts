import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  getCountFromServer,
  Timestamp,
  doc,
  getDoc,
  collectionGroup // Import collectionGroup for potential future use
} from "firebase/firestore";
import type { SapTicket, Shipment, StatsSnapshot, UserProfile } from "~/types/firestore.types";
import { app as firebaseApp } from "~/firebase.config"; // Use aliased import
import { getAuth } from "firebase/auth"; // Needed to potentially get current user

const db = getFirestore(firebaseApp);
const TICKET_SECTORS = ['CHR', 'HACCP', 'Kezia', 'Tabac']; // Define valid sectors

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
    const collRef = collection(db, "Envoi");
    // Query for documents where statutExpedition is NOT "OUI"
    // Firestore doesn't have a direct "not equal" for multiple values or null checks easily combined.
    // A common workaround is fetching all and filtering client-side, or structuring data differently.
    // For simplicity here, let's assume rules filter correctly and we count docs where statutExpedition != 'OUI'.
    // This might require fetching more data than ideal if rules aren't perfectly restrictive.
    // A more robust Firestore query might involve multiple queries or data restructuring.
    // Let's try querying for 'NON' or other expected non-'OUI' values if known.
    // If 'statutExpedition' can be missing or null, those are also "active".

    // Example: Query for 'NON' explicitly, assuming it's the main "active" status besides null/missing
    // This is an approximation and might need refinement based on actual data values.
    const q = query(collRef, where("statutExpedition", "!=", "OUI")); // Query for not equal to "OUI"

    const snapshot = await getCountFromServer(q);
    const totalCount = snapshot.data().count;

    console.log("[SDK] Active shipment count (Envoi, statutExpedition != 'OUI', filtered by rules) fetched:", totalCount);
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
    const collRef = collection(db, "Envoi");
    // Similar challenge as above for filtering active shipments efficiently.
    // We fetch documents potentially filtered by rules and then check status client-side.
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

    console.log("[SDK] Active client count (Envoi, inefficient, filtered by rules) fetched:", activeClients.size);
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
export const getRecentShipmentsSdk = async (count: number): Promise<Shipment[]> => {
   try {
     const collRef = collection(db, "Envoi");
     // Assuming a 'dateCreation' field for ordering (replace if different or remove orderBy)
     // If no date field, remove orderBy and rely on limit only
     // Add orderBy field if available, e.g., orderBy("dateCreation", "desc")
     const q = query(collRef, /* orderBy("dateCreation", "desc"), */ limit(count));
     const querySnapshot = await getDocs(q);

     const recentShipments: Shipment[] = [];
     querySnapshot.forEach((doc) => {
       // Firestore rules ensure we only get docs the user can access
       recentShipments.push(docToShipment(doc.id, doc.data()));
     });

     console.log(`[SDK] Fetched ${recentShipments.length} recent shipments from Envoi (filtered by rules).`);
     return recentShipments;

   } catch (error) {
     console.error("[SDK] Error getting recent shipments from Envoi (check rules/permissions):", error);
     return [];
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
