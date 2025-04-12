import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useOutletContext } from "@remix-run/react";
import React, { useState, useEffect, lazy, Suspense } from "react"; // Import lazy and Suspense

import { StatsCard } from "~/components/StatsCard";
// import InteractiveMap from "~/components/InteractiveMap"; // Remove static import
const InteractiveMap = lazy(() => import("~/components/InteractiveMap")); // Dynamic import
import { RecentTickets } from "~/components/RecentTickets";
import { RecentShipments } from "~/components/RecentShipments";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicket, faTruckFast, faUsers, faMapMarkedAlt, faSpinner, faExclamationTriangle, faMap } from "@fortawesome/free-solid-svg-icons"; // Added faMap

// Import types
import type { DashboardLoaderData, SapTicket, Shipment, AppUser, StatsSnapshot, UserProfile } from "~/types/firestore.types";

// Import Firestore service functions (SDK versions)
import {
  getRecentTicketsSdk,
  getRecentShipmentsSdk,
  getLatestStatsSnapshotsSdk,
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

type OutletContextType = { user: AppUser | null };

// Define type for evolution data
type EvolutionData = {
  ticketCount: number | null;
  shipmentCount: number | null;
  clientCount: number | null;
};

// Fallback component for Suspense
const MapLoadingFallback = () => (
  <div className="bg-jdc-card p-4 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]">
    <FontAwesomeIcon icon={faSpinner} spin className="text-jdc-yellow text-3xl mb-4" />
    <p className="text-jdc-gray-400 text-center">Chargement de la carte...</p>
  </div>
);

// Fallback component when user is not logged in
const MapLoginPrompt = () => (
   <div className="bg-jdc-card p-4 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]">
        <FontAwesomeIcon icon={faMapMarkedAlt} className="text-jdc-gray-500 text-4xl mb-4" />
        <p className="text-jdc-gray-400 text-center">Connectez-vous pour voir la carte des tickets.</p>
   </div>
);

export default function Dashboard() {
  const { user } = useOutletContext<OutletContextType>();
  const [isClient, setIsClient] = useState(false); // State to track client-side rendering

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
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [loadingShipments, setLoadingShipments] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Set isClient to true only on the client side after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect to fetch data when user is available or fetchTrigger changes
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        console.log("Dashboard Effect: No user logged in, skipping data fetch.");
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

      setLoadingStats(true);
      setLoadingTickets(true);
      setLoadingShipments(true);
      setError(null);
      console.log("Dashboard Effect: User found, attempting to fetch data using SDK...");

      try {
        console.log(`Dashboard Effect: Fetching user profile for ${user.uid}...`);
        const userProfile: UserProfile | null = await getUserProfile(user.uid);
        const userSectors: string[] = userProfile?.secteurs ?? [];
        console.log("Dashboard Effect: User profile fetched.", { userProfile, userSectors });

        if (!userProfile) {
            console.warn("Dashboard Effect: User profile not found, proceeding with potentially limited data.");
        }

        console.log("Dashboard Effect: Fetching latest snapshot, live counts, and recent items (SDK)...");
        const [
            latestSnapshotResult,
            fetchedLiveTicketCount,
            fetchedLiveShipmentCount,
            fetchedLiveClientCount,
            fetchedTickets,
            fetchedShipments
        ] = await Promise.all([
          getLatestStatsSnapshotsSdk(1).catch(err => { console.error("[SDK] Error fetching latest snapshot:", err); return []; }),
          getTotalTicketCountSdk(userSectors).catch(err => { console.error("[SDK] Error fetching live ticket count:", err); return null; }),
          getActiveShipmentCountSdk().catch(err => { console.error("[SDK] Error fetching live shipment count:", err); return null; }),
          getActiveClientCountInefficientSdk().catch(err => { console.error("[SDK] Error fetching live client count:", err); return null; }),
          getRecentTicketsSdk(20, userSectors).catch(err => { console.error("[SDK] Error fetching recent tickets:", err); return []; }),
          getRecentShipmentsSdk(5).catch(err => { console.error("[SDK] Error fetching recent shipments:", err); return []; }),
        ]);
        console.log("Dashboard Effect: Data fetched (SDK).", { latestSnapshotResult, fetchedLiveTicketCount, fetchedLiveShipmentCount, fetchedLiveClientCount, fetchedTickets, fetchedShipments });

        const latestSnapshot: StatsSnapshot | null = latestSnapshotResult.length > 0 ? latestSnapshotResult[0] : null;
        console.log("Dashboard Effect: Latest Snapshot:", latestSnapshot);

        const calculatedEvolution: EvolutionData = {
          ticketCount: null,
          shipmentCount: null,
          clientCount: null,
        };

        if (fetchedLiveTicketCount !== null && latestSnapshot?.ticketCount !== undefined) {
          calculatedEvolution.ticketCount = fetchedLiveTicketCount - latestSnapshot.ticketCount;
        } else if (fetchedLiveTicketCount !== null) {
            calculatedEvolution.ticketCount = 0;
            console.log("Dashboard Effect: No latest snapshot ticket count for evolution, setting to 0.");
        }

        if (fetchedLiveShipmentCount !== null && latestSnapshot?.shipmentCount !== undefined) {
          calculatedEvolution.shipmentCount = fetchedLiveShipmentCount - latestSnapshot.shipmentCount;
        } else if (fetchedLiveShipmentCount !== null) {
            calculatedEvolution.shipmentCount = 0;
            console.log("Dashboard Effect: No latest snapshot shipment count for evolution, setting to 0.");
        }

        if (fetchedLiveClientCount !== null && latestSnapshot?.clientCount !== undefined) {
          calculatedEvolution.clientCount = fetchedLiveClientCount - latestSnapshot.clientCount;
        } else if (fetchedLiveClientCount !== null) {
            calculatedEvolution.clientCount = 0;
            console.log("Dashboard Effect: No latest snapshot client count for evolution, setting to 0.");
        }

        console.log("Dashboard Effect: Calculated Evolution (Live - Snapshot):", calculatedEvolution);

        setLiveTicketCount(fetchedLiveTicketCount);
        setLiveShipmentCount(fetchedLiveShipmentCount);
        setLiveClientCount(fetchedLiveClientCount);
        setEvolution(calculatedEvolution);
        setLoadingStats(false);

        setRecentTickets(fetchedTickets);
        setRecentShipments(fetchedShipments);
        setLoadingTickets(false);
        setLoadingShipments(false);

      } catch (err: any) {
        console.error("Dashboard Effect: General error fetching data (SDK):", err);
        setError(err.message || "Erreur lors du chargement des données via SDK.");
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
  }, [user, fetchTrigger]);

   useEffect(() => {
    if (user) {
      console.log("Dashboard: User logged in, triggering data fetch.");
      setFetchTrigger(prev => prev + 1);
    }
   }, [user]);


  // --- Render Logic ---

  const formatStatValue = (value: number | string | null, isLoading: boolean): string => {
     if (isLoading) return "...";
     if (value === null || value === undefined) return "N/A";
     return value.toString();
  };

  const statsData = [
    { title: "Tickets SAP (Total)", valueState: liveTicketCount, icon: faTicket, evolutionKey: 'ticketCount' },
    { title: "Envois CTN Actifs", valueState: liveShipmentCount, icon: faTruckFast, evolutionKey: 'shipmentCount' },
    { title: "Clients Actifs (Distincts)", valueState: liveClientCount, icon: faUsers, evolutionKey: 'clientCount' },
  ];

  const isOverallLoading = loadingStats || loadingTickets || loadingShipments;
  const ticketsForList = recentTickets.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Tableau de Bord</h1>

      {error && !isOverallLoading && (
        <div className="flex items-center p-4 bg-red-800 text-white rounded-lg mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          Erreur générale: {error}
        </div>
      )}

       {loadingStats && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {statsData.map((stat) => (
             <StatsCard
               key={stat.title}
               title={stat.title}
               value="..."
               icon={stat.icon}
               isLoading={true}
               evolutionValue={null}
             />
           ))}
         </div>
       )}

      {!loadingStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsData.map((stat) => {
             const mainValue = stat.valueState;
             const evolutionDisplayValue = evolution[stat.evolutionKey as keyof EvolutionData];
             return (
               <StatsCard
                 key={stat.title}
                 title={stat.title}
                 value={formatStatValue(mainValue, false)}
                 icon={stat.icon}
                 isLoading={false}
                 evolutionValue={evolutionDisplayValue}
               />
             );
          })}
        </div>
      )}

      {/* Map and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Map Display - Render only on client */}
        {isClient ? (
          user ? (
            <Suspense fallback={<MapLoadingFallback />}>
              <InteractiveMap
                tickets={recentTickets}
                isLoadingTickets={loadingTickets}
              />
            </Suspense>
          ) : (
            <MapLoginPrompt /> // Show login prompt if user logged out on client
          )
        ) : (
          // Server-side rendering or initial client render before hydration: show placeholder
          <MapLoadingFallback />
        )}

        {/* Recent Tickets & Shipments Lists */}
        <div className="space-y-6">
          <RecentTickets
             tickets={ticketsForList}
             isLoading={loadingTickets}
          />
          <RecentShipments
             shipments={recentShipments}
             isLoading={loadingShipments}
          />
        </div>
      </div>

       {!user && !isOverallLoading && (
         <div className="p-4 bg-jdc-card rounded-lg text-center text-jdc-gray-300 mt-6">
           Veuillez vous connecter pour voir le tableau de bord.
         </div>
       )}
    </div>
  );
}
