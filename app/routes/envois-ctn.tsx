import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Envois CTN | JDC Dashboard" }];
};

export default function EnvoisCtn() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Suivi des Envois CTN</h1>
      <p className="text-jdc-gray-400 mt-2">Page en construction.</p>
      {/* Add shipment tracking table/components here */}
    </div>
  );
}
