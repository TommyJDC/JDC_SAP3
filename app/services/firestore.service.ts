import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  doc,
  getDoc,
  setDoc, // Import setDoc
  updateDoc, // Keep updateDoc for editing
  serverTimestamp,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
  type SetOptions,
} from 'firebase/firestore';
import { db } from '~/firebase.config'; // Use the initialized db instance
import type { UserProfile, SapTicket, Shipment, GeocodeCacheEntry } from '~/types/firestore.types';

// --- User Profile Functions ---

/**
 * Fetches a single user profile document from Firestore.
 * @param uid The user's unique ID.
 * @returns The UserProfile data or null if not found.
 */
export const getUserProfileSdk = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      // Combine doc ID (uid) with data
      return { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
    } else {
      console.log(`No profile found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Impossible de récupérer le profil utilisateur.");
  }
};

/**
 * Fetches all user profile documents from Firestore.
 * Requires appropriate Firestore rules.
 * @returns An array of UserProfile data.
 */
export const getAllUserProfilesSdk = async (): Promise<UserProfile[]> => {
  try {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, orderBy('email')); // Order by email for consistency
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() } as UserProfile);
    });
    return users;
  } catch (error) {
    console.error("Error fetching all user profiles:", error);
    // Consider Firestore permissions if this fails
    throw new Error("Impossible de récupérer la liste des utilisateurs.");
  }
};

/**
 * Creates a new user profile document in Firestore.
 * Typically called after successful Firebase Auth user creation.
 * @param uid The user's unique ID (from Firebase Auth).
 * @param email The user's email.
 * @param displayName The user's display name.
 * @param initialRole The initial role assigned to the user (e.g., 'Technician').
 * @returns The newly created UserProfile data.
 */
export const createUserProfileSdk = async (
    uid: string,
    email: string,
    displayName: string,
    initialRole: string = 'Technician' // Default role
): Promise<UserProfile> => {
    if (!uid || !email || !displayName) {
        throw new Error("UID, email, and display name are required to create a profile.");
    }
    try {
        const userDocRef = doc(db, 'users', uid);
        const newUserProfile: Omit<UserProfile, 'uid'> = { // Use Omit to exclude uid from the object literal
            email: email,
            displayName: displayName,
            role: initialRole,
            secteurs: [], // Start with empty sectors
            // Add any other default fields here, e.g., createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, newUserProfile);
        console.log(`User profile created successfully for UID: ${uid}`);
        // Return the full profile including the uid
        return { uid, ...newUserProfile };
    } catch (error) {
        console.error("Error creating user profile in Firestore:", error);
        throw new Error("Impossible de créer le profil utilisateur dans la base de données.");
    }
};


/**
 * Updates specific fields of a user profile document in Firestore.
 * Requires appropriate Firestore rules.
 * @param uid The ID of the user profile to update.
 * @param data An object containing the fields to update.
 */
export const updateUserProfileSdk = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  if (!uid || !data || Object.keys(data).length === 0) {
    console.warn("Update user profile called with invalid UID or empty data.");
    return; // Or throw an error if preferred
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
    console.log(`User profile updated successfully for UID: ${uid}`);
  } catch (error) {
    console.error(`Error updating user profile for UID ${uid}:`, error);
    throw new Error("Impossible de mettre à jour le profil utilisateur.");
  }
};


// --- SAP Ticket Functions ---
// (Keep existing functions)
export const getRecentTicketsForSectors = async (sectors: string[], count: number = 5): Promise<SapTicket[]> => {
  // ... (implementation remains the same)
  if (!sectors || sectors.length === 0) return [];
  console.log(`[FirestoreService] Fetching recent tickets for sectors: ${sectors.join(', ')}`);

  // Firestore doesn't support OR queries across different collections directly.
  // We need to query each collection and merge/sort the results.
  const ticketPromises = sectors.map(async (sector) => {
    try {
      const sectorCollectionRef = collection(db, sector); // Use sector name as collection name
      const q = query(
        sectorCollectionRef,
        orderBy('date', 'desc'), // Assuming 'date' field exists and is sortable
        limit(count) // Fetch a bit more initially if merging many sectors
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        secteur: sector, // Add sector info to the result
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(0) // Convert Timestamp to Date
      } as SapTicket));
    } catch (error) {
      console.error(`Error fetching tickets for sector ${sector}:`, error);
      return []; // Return empty array for this sector on error
    }
  });

  try {
    const resultsBySector = await Promise.all(ticketPromises);
    const allTickets = resultsBySector.flat(); // Combine results from all sectors

    // Sort all combined tickets by date descending and take the top 'count'
    allTickets.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.log(`[FirestoreService] Found ${allTickets.length} tickets across sectors, returning top ${count}`);
    return allTickets.slice(0, count);
  } catch (error) {
    console.error("Error merging ticket results:", error);
    throw new Error("Impossible de récupérer les tickets récents.");
  }
};


// --- Shipment Functions ---
// (Keep existing functions)
export const getRecentShipmentsForSectors = async (sectors: string[], count: number = 5): Promise<Shipment[]> => {
  // ... (implementation remains the same)
  if (!sectors || sectors.length === 0) return [];
  console.log(`[FirestoreService] Fetching recent shipments for sectors: ${sectors.join(', ')}`);

  try {
    const shipmentsCollectionRef = collection(db, 'Envoi'); // Assuming 'Envoi' is the collection name
    const q = query(
      shipmentsCollectionRef,
      where('secteur', 'in', sectors), // Filter by sectors the user belongs to
      // Add orderBy if you have a relevant timestamp field, e.g., 'dateCreation'
      // orderBy('dateCreation', 'desc'),
      limit(count)
    );
    const querySnapshot = await getDocs(q);
    const shipments: Shipment[] = [];
    querySnapshot.forEach((doc) => {
      shipments.push({ id: doc.id, ...doc.data() } as Shipment);
    });
    console.log(`[FirestoreService] Found ${shipments.length} recent shipments.`);
    return shipments;
  } catch (error) {
    console.error("Error fetching recent shipments:", error);
    throw new Error("Impossible de récupérer les envois récents.");
  }
};

export const getAllActiveShipmentsForSectors = async (sectors: string[]): Promise<Shipment[]> => {
    if (!sectors || sectors.length === 0) return [];
    console.log(`[FirestoreService] Fetching ALL active shipments for sectors: ${sectors.join(', ')}`);

    try {
        const shipmentsCollectionRef = collection(db, 'Envoi');
        const q = query(
            shipmentsCollectionRef,
            where('secteur', 'in', sectors),
            where('statutExpedition', '==', 'NON') // Filter for active shipments
        );
        const querySnapshot = await getDocs(q);
        const shipments: Shipment[] = [];
        querySnapshot.forEach((doc) => {
            shipments.push({ id: doc.id, ...doc.data() } as Shipment);
        });
        console.log(`[FirestoreService] Found ${shipments.length} active shipments.`);
        return shipments;
    } catch (error) {
        console.error("Error fetching active shipments:", error);
        throw new Error("Impossible de récupérer les envois actifs.");
    }
};


// --- Geocoding Cache ---

/**
 * Gets a geocoding result from the Firestore cache.
 * @param address The normalized address string used as the document ID.
 * @returns The cached coordinates or null if not found/expired.
 */
export const getGeocodeFromCache = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const cacheDocRef = doc(db, 'geocodeCache', address);
    const docSnap = await getDoc(cacheDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as GeocodeCacheEntry;
      // Optional: Add cache expiry logic here if needed based on data.timestamp
      // const now = new Date();
      // const cacheTimestamp = (data.timestamp as firebase.firestore.Timestamp)?.toDate();
      // if (cacheTimestamp && now.getTime() - cacheTimestamp.getTime() > CACHE_DURATION_MS) {
      //   console.log(`Geocode cache expired for address: ${address}`);
      //   return null;
      // }
      console.log(`Geocode cache hit for address: ${address}`);
      return { latitude: data.latitude, longitude: data.longitude };
    } else {
      console.log(`Geocode cache miss for address: ${address}`);
      return null;
    }
  } catch (error) {
    console.error("Error getting geocode from cache:", error);
    return null; // Don't block geocoding on cache errors
  }
};

/**
 * Saves a geocoding result to the Firestore cache.
 * @param address The normalized address string used as the document ID.
 * @param latitude The latitude coordinate.
 * @param longitude The longitude coordinate.
 */
export const saveGeocodeToCache = async (address: string, latitude: number, longitude: number): Promise<void> => {
  try {
    const cacheDocRef = doc(db, 'geocodeCache', address);
    const cacheEntry: Omit<GeocodeCacheEntry, 'timestamp'> & { timestamp: any } = {
      latitude,
      longitude,
      timestamp: serverTimestamp(), // Use server timestamp for consistency
    };
    await setDoc(cacheDocRef, cacheEntry);
    console.log(`Geocode saved to cache for address: ${address}`);
  } catch (error) {
    console.error("Error saving geocode to cache:", error);
    // Handle error as needed (e.g., log, but don't fail the main operation)
  }
};
