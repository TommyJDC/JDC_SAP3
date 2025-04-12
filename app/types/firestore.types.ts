// Base type for user data from auth service
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Type for data stored in the /users collection in Firestore
export interface UserProfile {
  uid: string; // Should match auth uid
  email: string;
  displayName?: string;
  role: 'Admin' | 'Commercial' | 'Technician'; // Define roles
  secteurs?: string[]; // Optional: For sector-specific access
  // Add other profile fields as needed
}

// Type for SAP Tickets (adjust fields based on actual Firestore data)
export interface SapTicket {
  id: string; // Document ID
  adresse?: string;
  codeClient?: string;
  date?: any; // Can be Firestore Timestamp or string - handle conversion
  demandeSAP?: string;
  messageId?: string;
  numeroSAP?: string;
  raisonSociale?: string;
  secret?: string;
  solution?: string;
  statut?: 'Ouvert' | 'En cours' | 'Fermé' | 'Nouveau' | 'Demande de RMA' | string; // Allow other statuses too
  summary?: string;
  telephone?: string;
  secteur: string; // Added to know the origin collection
}

// Type for Shipments (adjust fields based on actual Firestore data)
export interface Shipment {
  id: string; // Document ID
  articleNom?: string;
  bt?: string;
  codeClient?: string;
  nomClient?: string;
  secteur?: string;
  statutExpedition?: 'OUI' | 'NON' | 'RELICAT' | string; // Added RELICAT, allow other statuses too
  trackingLink?: string;
  dateCreation?: any; // Added for sorting/display (Timestamp or Date)
}

// Type for data expected by the Dashboard component (now fetched client-side)
export interface DashboardStats {
  ticketCount: number | null;
  shipmentCount: number | null;
  clientCount: number | null;
}

// Type for the (now minimal) data returned by the dashboard loader
export interface DashboardLoaderData {
 // No longer fetching data here, could be empty or hold static config
 // Example: maybe theme preference or static text?
}

// Type for Geocoding Cache stored in Firestore
export interface GeocodeCacheEntry {
  // The document ID will be the normalized address string
  latitude: number;
  longitude: number;
  timestamp: any; // Firestore Timestamp (serverTimestamp())
}


// Type for Articles
export interface Article {
  id: string; // Document ID
  nom: string;
  reference: string;
  // Add other article fields
}

// Type for Daily Stats Snapshots
export interface StatsSnapshot {
  id: string; // Document ID (e.g., "2023-10-27")
  timestamp: any; // Firestore Timestamp
  ticketCount: number;
  shipmentCount: number;
  clientCount: number;
}
