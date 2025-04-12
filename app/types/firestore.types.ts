/**
 * Represents the structure of user profile data stored in Firestore.
 */
export interface UserProfile {
  uid: string;
  email: string;
  role: 'Admin' | 'Technician' | string; // Define known roles, allow string for flexibility
  secteurs: string[]; // Array of sectors the user belongs to
  displayName?: string; // Optional display name
}

/**
 * Represents a SAP ticket document from Firestore sector collections (CHR, HACCP, etc.).
 */
export interface SapTicket {
  id: string; // Document ID
  // Add other fields based on your Firestore structure
  date: Date | firebase.firestore.Timestamp; // Example field
  client: string; // Example field
  description: string; // Example field
  statut: string; // Example field
  secteur: string; // Added to indicate the source sector/collection
  // ... other ticket properties
}

/**
 * Represents a Shipment document from the 'Envoi' collection in Firestore.
 */
export interface Shipment {
  id: string; // Document ID
  // Add other fields based on your Firestore structure
  codeClient: string;
  nomClient: string;
  adresse: string;
  ville: string;
  codePostal: string;
  statutExpedition: 'OUI' | 'NON' | string; // Example status field
  secteur: string; // Sector associated with the shipment (used for rules)
  dateCreation?: Date | firebase.firestore.Timestamp; // Optional: If you add this field later
  latitude?: number; // Added for map display
  longitude?: number; // Added for map display
  // ... other shipment properties
}

/**
 * Represents a snapshot of statistics stored in Firestore (e.g., in 'dailyStatsSnapshots').
 */
export interface StatsSnapshot {
  id: string; // Document ID (e.g., date string 'YYYY-MM-DD')
  timestamp: Date | firebase.firestore.Timestamp; // When the snapshot was taken
  totalTickets: number;
  activeShipments: number;
  activeClients: number;
  // Add other stats fields as needed
}

/**
 * Represents a geocoding cache entry in Firestore.
 * Document ID is the normalized address string.
 */
export interface GeocodeCacheEntry {
  latitude: number;
  longitude: number;
  timestamp: firebase.firestore.FieldValue | firebase.firestore.Timestamp; // Use FieldValue for serverTimestamp on write
}

// Re-export AppUser from auth.service for convenience if needed elsewhere
// Or keep imports separate where used.
// export type { AppUser } from '~/services/auth.service';

// Namespace Firebase types if needed to avoid conflicts, e.g.,
import * as firebase from 'firebase/firestore';

// Note: Ensure you have consistent Timestamp handling (either Firebase Timestamps
// or JS Dates) throughout your application where these types are used.
// Conversion often happens when fetching/sending data.
