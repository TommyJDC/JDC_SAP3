import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useOutletContext } from "@remix-run/react";
import React, { useState, useEffect } from "react";

import { StatsCard } from "~/components/StatsCard";
import { MapDisplay } from "~/components/MapDisplay";
import { RecentTickets } from "~/components/RecentTickets";
import { RecentShipments } from "~/components/RecentShipments";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicket, faTruckFast, faUsers, faMapMarkedAlt, faSpinner, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

// Import types
import type { DashboardLoaderData, SapTicket, Shipment, AppUser, StatsSnapshot, UserProfile } from "~/types/firestore.types";

// Import Firestore service functions (SDK versions)
import {
  getRecentTicketsSdk,
  getRecentShipmentsSdk,
  getLatestStatsSnapshotsSdk, // Will fetch only the latest snapshot now
  getUserProfile,
  getTotalTicketCountSdk,
  getActiveShipmentCountSdk,
  getActiveClientCountInefficientSdk,
} from "~/services/firestore.service";


export const meta: MetaFunction = () => {
  return [{ title: "Tableau de Bord | JDC Dashboard" }];
};

// Loader remains minimal
export const loader = async () => {
  console.log("Dashboard Loader: Executing (minimal work).");
  return json({});
};

// Mock position for the map
const mockMapPosition: [number, number] = [48.8566, 2.3522]; // Paris coordinates

type OutletContextType = { user: AppUser | null };

// Define type for evolution data
type EvolutionData = {
  ticketCount: number | null;
  shipmentCount: number | null;
  clientCount: number | null;
};

export default function Dashboard() {
  const { user } = useOutletContext<OutletContextType>();

  // State for LIVE counts
  const [liveTicketCount, setLiveTicketCount] = useState<number | null>(null);
  const [liveShipmentCount, setLiveShipmentCount] = useState<number | null>(null);
  const [liveClientCount, setLiveClientCount] = useState<number | null>(null);

  // State for evolution data (calculated: live - latest snapshot)
  const [evolution, setEvolution] = useState<EvolutionData>({
    ticketCount: null,
    shipmentCount: null,
    clientCount: null,
  });

  // State for recent items
  const [recentTickets, setRecentTickets] = useState<SapTicket[]>([]);
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);

  // Loading states
  const [loadingStats, setLoadingStats] = useState<boolean>(true); // Covers live counts + snapshot + evolution calc
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [loadingShipments, setLoadingShipments] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0); // State to trigger refetch on login

  // Effect to fetch data when user is available or fetchTrigger changes
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        console.log("Dashboard Effect: No user logged in, skipping data fetch.");
        // Reset state on logout
        setLoadingStats(false);
        setLoadingTickets(false);
        setLoadingShipments(false);
        setLiveTicketCount(null);
        setLiveShipmentCount(null);
        setLiveClientCount(null);
        setEvolution({ ticketCount: null, shipmentCount: null, clientCount: null });
        setRecentTickets([]);
        setRecentShipments([]);
        setError(null);
        return;
      }

      // User is logged in, start loading
      setLoadingStats(true);
      setLoadingTickets(true);
      setLoadingShipments(true);
      setError(null);
      console.log("Dashboard Effect: User found, attempting to fetch data using SDK...");

      try {
        // --- Fetch User Profile FIRST to get sectors ---
        console.log(`Dashboard Effect: Fetching user profile for ${user.uid}...`);
        const userProfile: UserProfile | null = await getUserProfile(user.uid);
        const userSectors: string[] = userProfile?.secteurs ?? [];
        console.log("Dashboard Effect: User profile fetched.", { userProfile, userSectors });

        if (!userProfile) {
            console.warn("Dashboard Effect: User profile not found, proceeding with potentially limited data.");
            // Decide if you want to block further loading or allow partial data
        }

        // --- Fetch Latest Snapshot, Live Counts, and Recent Items in Parallel ---
        console.log("Dashboard Effect: Fetching latest snapshot, live counts, and recent items (SDK)...");
        const [
            latestSnapshotResult, // Array containing 0 or 1 snapshot
            fetchedLiveTicketCount,
            fetchedLiveShipmentCount,
            fetchedLiveClientCount,
            fetchedTickets,
            fetchedShipments
        ] = await Promise.all([
          getLatestStatsSnapshotsSdk(1).catch(err => { console.error("[SDK] Error fetching latest snapshot:", err); return []; }), // Fetch only 1
          getTotalTicketCountSdk(userSectors).catch(err => { console.error("[SDK] Error fetching live ticket count:", err); return null; }),
          getActiveShipmentCountSdk().catch(err => { console.error("[SDK] Error fetching live shipment count:", err); return null; }),
          getActiveClientCountInefficientSdk().catch(err => { console.error("[SDK] Error fetching live client count:", err); return null; }),
          getRecentTicketsSdk(5, userSectors).catch(err => { console.error("[SDK] Error fetching recent tickets:", err); return []; }),
          getRecentShipmentsSdk(5).catch(err => { console.error("[SDK] Error fetching recent shipments:", err); return []; }),
        ]);
        console.log("Dashboard Effect: Data fetched (SDK).", { latestSnapshotResult, fetchedLiveTicketCount, fetchedLiveShipmentCount, fetchedLiveClientCount, fetchedTickets, fetchedShipments });

        // --- Process Snapshot and Calculate Evolution ---
        const latestSnapshot: StatsSnapshot | null = latestSnapshotResult.length > 0 ? latestSnapshotResult[0] : null;
        console.log("Dashboard Effect: Latest Snapshot:", latestSnapshot);

        const calculatedEvolution: EvolutionData = {
          ticketCount: null,
          shipmentCount: null,
          clientCount: null,
        };

        // Calculate evolution only if live count and snapshot count are available
        if (fetchedLiveTicketCount !== null && latestSnapshot?.ticketCount !== undefined) {
          calculatedEvolution.ticketCount = fetchedLiveTicketCount - latestSnapshot.ticketCount;
        } else if (fetchedLiveTicketCount !== null) {
            calculatedEvolution.ticketCount = 0; // Or null? Treat as 0 if no snapshot baseline
            console.log("Dashboard Effect: No latest snapshot ticket count for evolution, setting to 0.");
        }

        if (fetchedLiveShipmentCount !== null && latestSnapshot?.shipmentCount !== undefined) {
          calculatedEvolution.shipmentCount = fetchedLiveShipmentCount - latestSnapshot.shipmentCount;
        } else if (fetchedLiveShipmentCount !== null) {
            calculatedEvolution.shipmentCount = 0; // Or null?
            console.log("Dashboard Effect: No latest snapshot shipment count for evolution, setting to 0.");
        }

        if (fetchedLiveClientCount !== null && latestSnapshot?.clientCount !== undefined) {
          calculatedEvolution.clientCount = fetchedLiveClientCount - latestSnapshot.clientCount;
        } else if (fetchedLiveClientCount !== null) {
            calculatedEvolution.clientCount = 0; // Or null?
            console.log("Dashboard Effect: No latest snapshot client count for evolution, setting to 0.");
        }

        // Optional: Set evolution to null if the difference is zero
        Object.keys(calculatedEvolution).forEach(key => {
            const typedKey = key as keyof EvolutionData;
            if (calculatedEvolution[typedKey] === 0) {
                // calculatedEvolution[typedKey] = null; // Uncomment to hide "+0" / "-0"
            }
        });

        console.log("Dashboard Effect: Calculated Evolution (Live - Snapshot):", calculatedEvolution);

        // --- Update State ---
        setLiveTicketCount(fetchedLiveTicketCount);
        setLiveShipmentCount(fetchedLiveShipmentCount);
        setLiveClientCount(fetchedLiveClientCount);
        setEvolution(calculatedEvolution);
        setLoadingStats(false); // Finish loading stats part

        setRecentTickets(fetchedTickets);
        setRecentShipments(fetchedShipments);
        setLoadingTickets(false);
        setLoadingShipments(false);

      } catch (err: any) {
        console.error("Dashboard Effect: General error fetching data (SDK):", err);
        setError(err.message || "Erreur lors du chargement des données via SDK.");
        // Reset data on general error
        setLiveTicketCount(null);
        setLiveShipmentCount(null);
        setLiveClientCount(null);
        setEvolution({ ticketCount: null, shipmentCount: null, clientCount: null });
        setRecentTickets([]);
        setRecentShipments([]);
        setLoadingStats(false);
        setLoadingTickets(false);
        setLoadingShipments(false);
      } finally {
         console.log("Dashboard Effect: SDK data fetching attempt finished.");
      }
    };

    loadDashboardData();
  }, [user, fetchTrigger]); // Re-run effect if user object changes OR fetchTrigger increments

   // Effect to trigger fetch when user logs in
   useEffect(() => {
    if (user) {
      console.log("Dashboard: User logged in, triggering data fetch.");
      setFetchTrigger(prev => prev + 1); // Increment to trigger the main effect
    }
   }, [user]);


  // --- Render Logic ---

  // Helper to format the main value
  const formatStatValue = (value: number | string | null, isLoading: boolean): string => {
     if (isLoading) return "...";
     if (value === null || value === undefined) return "N/A";
     return value.toString();
  };


  // Map titles to the correct state variables and evolution keys
  const statsData = [
    { title: "Tickets SAP (Total)", valueState: liveTicketCount, icon: faTicket, evolutionKey: 'ticketCount' },
    { title: "Envois CTN Actifs", valueState: liveShipmentCount, icon: faTruckFast, evolutionKey: 'shipmentCount' },
    { title: "Clients Actifs (Distincts)", valueState: liveClientCount, icon: faUsers, evolutionKey: 'clientCount' },
  ];

  // Determine overall loading state for the main content area
  const isOverallLoading = loadingStats || loadingTickets || loadingShipments;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Tableau de Bord</h1>

      {/* Global Error Message */}
      {error && !isOverallLoading && (
        <div className="flex items-center p-4 bg-red-800 text-white rounded-lg mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          Erreur générale: {error}
        </div>
      )}

       {/* Loading Indicator for Stats/Evolution */}
       {loadingStats && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {statsData.map((stat) => (
             <StatsCard
               key={stat.title}
               title={stat.title}
               value="..." // Show loading indicator
               icon={stat.icon}
               isLoading={true} // Explicitly set isLoading
               evolutionValue={null} // No evolution while loading
             />
           ))}
         </div>
       )}


      {/* Stats Cards - Render only when NOT loading stats */}
      {!loadingStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsData.map((stat) => {
             // Get the live value directly from the mapped state variable
             const mainValue = stat.valueState;
             // Get evolution value from the evolution state using the key
             const evolutionDisplayValue = evolution[stat.evolutionKey as keyof EvolutionData];

             console.log(`Rendering StatsCard for ${stat.title}:`);
             console.log(`  - Main Value Source: Live Count`);
             console.log(`  - Raw Main Value:`, mainValue);
             console.log(`  - Raw Evolution (Live - Snapshot):`, evolutionDisplayValue);

             return (
               <StatsCard
                 key={stat.title}
                 title={stat.title}
                 value={formatStatValue(mainValue, false)} // Format the live value
                 icon={stat.icon}
                 isLoading={false}
                 evolutionValue={evolutionDisplayValue} // Pass the calculated evolution
               />
             );
          })}
        </div>
      )}


      {/* Map and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Display */}
        <div className="bg-jdc-card p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
            <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-jdc-yellow" />
            Carte (Exemple)
          </h2>
          {/* Display map only if user is logged in */}
          {user ? (
             <MapDisplay position={mockMapPosition} />
          ) : (
             <p className="text-jdc-gray-400 text-center py-4">Connectez-vous pour voir la carte.</p>
          )}
        </div>

        {/* Recent Tickets & Shipments */}
        <div className="space-y-6">
          {/* Pass loading/error states and data */}
          <RecentTickets
             tickets={recentTickets}
             isLoading={loadingTickets}
          />
          <RecentShipments
             shipments={recentShipments}
             isLoading={loadingShipments}
          />
        </div>
      </div>

       {/* Login Prompt */}
       {!user && !isOverallLoading && (
         <div className="p-4 bg-jdc-card rounded-lg text-center text-jdc-gray-300 mt-6">
           Veuillez vous connecter pour voir le tableau de bord.
         </div>
       )}
    </div>
  );
}
