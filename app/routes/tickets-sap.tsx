import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Tickets SAP | JDC Dashboard" }];
};

export default function TicketsSap() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Gestion des Tickets SAP</h1>
      <p className="text-jdc-gray-400 mt-2">Page en construction.</p>
      {/* Add ticket management table/components here */}
    </div>
  );
}
