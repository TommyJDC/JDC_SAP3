import type { MetaFunction } from "@remix-run/node";
import { StatsCard } from "~/components/StatsCard";
import { MapDisplay } from "~/components/MapDisplay";
import { RecentTickets } from "~/components/RecentTickets";
import { RecentShipments } from "~/components/RecentShipments";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicket, faTruckFast, faUsers, faMapMarkedAlt } from "@fortawesome/free-solid-svg-icons";

export const meta: MetaFunction = () => {
  return [{ title: "Tableau de Bord | JDC Dashboard" }];
};

// Mock Data (replace with actual data fetching later)
const mockStats = [
  { title: "Tickets SAP Ouverts", value: "12", icon: faTicket, change: "+2", changeType: "increase" as const },
  { title: "Envois CTN Actifs", value: "5", icon: faTruckFast, change: "-1", changeType: "decrease" as const },
  { title: "Clients Actifs", value: "150", icon: faUsers },
];

const mockTickets = [
  { id: "T001", client: "Client A", status: "Ouvert", date: "2024-07-26" },
  { id: "T002", client: "Client B", status: "En cours", date: "2024-07-25" },
  { id: "T003", client: "Client C", status: "Fermé", date: "2024-07-24" },
];

const mockShipments = [
  { id: "E001", destination: "Paris", status: "En transit", date: "2024-07-26" },
  { id: "E002", destination: "Lyon", status: "Livré", date: "2024-07-25" },
];

// Mock position for the map (e.g., JDC HQ or a central point)
const mockMapPosition: [number, number] = [48.8566, 2.3522]; // Paris coordinates

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Tableau de Bord</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockStats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            changeType={stat.changeType}
          />
        ))}
      </div>

      {/* Map and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Display */}
        <div className="bg-jdc-card p-4 rounded-lg shadow-lg">
           <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
             <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-jdc-yellow" />
             Carte (Exemple)
           </h2>
           <MapDisplay position={mockMapPosition} />
        </div>

        {/* Recent Tickets & Shipments */}
        <div className="space-y-6">
          <RecentTickets tickets={mockTickets} />
          <RecentShipments shipments={mockShipments} />
        </div>
      </div>

    </div>
  );
}
