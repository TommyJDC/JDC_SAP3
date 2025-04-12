import React from 'react';
import { Link } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruckFast, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Card, CardHeader, CardBody } from './ui/Card'; // Assuming Card components exist
import { Button } from './ui/Button';

interface Shipment {
  id: string;
  destination: string;
  status: string;
  date: string; // Consider using Date object if needed
}

interface RecentShipmentsProps {
  shipments: Shipment[];
  className?: string;
}

const statusColors: Record<string, string> = {
  'En transit': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Livré': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Problème': 'bg-red-500/20 text-red-400 border border-red-500/30',
};

export const RecentShipments: React.FC<RecentShipmentsProps> = ({ shipments, className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <FontAwesomeIcon icon={faTruckFast} className="mr-2 text-jdc-yellow" />
          Envois CTN Récents
        </h2>
        <Button as="link" to="/envois-ctn" variant="ghost" size="sm" rightIcon={<FontAwesomeIcon icon={faArrowRight} />}>
          Voir tout
        </Button>
      </CardHeader>
      <CardBody className="p-0"> {/* Remove padding for full-width list */}
        {shipments.length === 0 ? (
          <p className="text-jdc-gray-400 text-center py-4 px-6">Aucun envoi récent.</p>
        ) : (
          <ul className="divide-y divide-jdc-gray-800">
            {shipments.map((shipment) => (
              <li key={shipment.id} className="px-4 py-3 sm:px-6 hover:bg-jdc-gray-800/50 transition-colors">
                <Link to={`/envois-ctn/${shipment.id}`} className="block"> {/* Link to specific shipment */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white truncate">{shipment.destination} - <span className="text-jdc-gray-300">#{shipment.id}</span></p>
                    <p className="text-xs text-jdc-gray-400">{shipment.date}</p>
                  </div>
                  <div className="mt-1">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[shipment.status] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                      {shipment.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
};
