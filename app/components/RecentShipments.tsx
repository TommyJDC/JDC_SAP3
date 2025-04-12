import React from 'react';
import type { Shipment } from '~/types/firestore.types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruckFast, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import tailwindConfig from '../../tailwind.config'; // Import Tailwind config

interface RecentShipmentsProps {
  shipments: Shipment[];
  isLoading?: boolean;
  error?: string | null;
}

// Get the color value from the resolved config
const jdcYellowColor = tailwindConfig.theme.extend.colors['jdc-yellow'];

export const RecentShipments: React.FC<RecentShipmentsProps> = ({ shipments, isLoading = false, error = null }) => {

  const getClientDisplay = (shipment: Shipment): string => {
    return shipment.nomClient || shipment.codeClient || 'Client inconnu';
  };

  // Function to determine status info (Updated with colors)
  const getStatusInfo = (status?: 'OUI' | 'NON' | string): { text: string; className: string } => {
    switch (status?.toUpperCase()) { // Convert to uppercase for case-insensitivity
      case 'OUI':
        return { text: 'Livré', className: 'bg-green-600 text-white' }; // Green for delivered
      case 'NON':
        return { text: 'En cours', className: 'bg-yellow-500 text-black' }; // Yellow for in progress
      // Add more cases if needed for other specific statuses
      // e.g., case 'ANNULÉ': return { text: 'Annulé', className: 'bg-red-600 text-white' };
      default:
        // Use gray for unknown or other statuses
        return { text: status || 'Inconnu', className: 'bg-jdc-gray-500 text-white' };
    }
  };

  return (
    <div className="bg-jdc-card p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
         {/* Use color prop for FontAwesomeIcon */}
        <FontAwesomeIcon icon={faTruckFast} className="mr-2" color={jdcYellowColor} />
        Envois CTN Récents
      </h2>
       {isLoading && (
        <div className="flex items-center justify-center text-jdc-gray-300 py-4">
          <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
          Chargement...
        </div>
      )}
      {error && !isLoading && (
         <div className="flex items-center text-red-400 py-4">
           <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
           Erreur: {error}
         </div>
      )}
      {!isLoading && !error && shipments.length === 0 && (
        <p className="text-jdc-gray-400 text-center py-4">Aucun envoi récent à afficher.</p>
      )}
      {!isLoading && !error && shipments.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {shipments.map((shipment) => {
            const statusInfo = getStatusInfo(shipment.statutExpedition); // Get status info including className
            return (
              <li key={shipment.id} className="flex justify-between items-start text-sm p-2 bg-jdc-gray-800 rounded hover:bg-jdc-gray-700">
                <div className="flex-grow mr-2">
                  <span className="font-medium text-white block">{getClientDisplay(shipment)}</span>
                  <span className="text-jdc-gray-400 block text-xs">
                    {shipment.articleNom || 'Article inconnu'} - BT: {shipment.bt || 'N/A'}
                  </span>
                   {/* Optional: Add date here if available in Shipment type */}
                </div>
                <div className="flex-shrink-0 text-right">
                  {/* Apply status classes */}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${statusInfo.className}`}>
                    {statusInfo.text}
                  </span>
                  {/* Optional: Add link to tracking if available */}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
