import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruckFast, faExternalLinkAlt, faBuilding, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { Shipment } from '~/types/firestore.types';
import { getShipmentStatusStyle } from '~/utils/styleUtils'; // Import the utility function
import { Button } from './ui/Button'; // Assuming Button component handles links

interface RecentShipmentsProps {
  shipments: Shipment[];
  isLoading: boolean;
}

// Helper function to group shipments by client name
const groupShipmentsByClient = (shipments: Shipment[]): Map<string, Shipment[]> => {
  const grouped = new Map<string, Shipment[]>();
  if (!Array.isArray(shipments)) {
    return grouped; // Return empty map if shipments is not an array
  }
  shipments.forEach(shipment => {
    const clientName = shipment.nomClient || 'Client Inconnu'; // Use fallback name
    const existing = grouped.get(clientName);
    if (existing) {
      existing.push(shipment);
    } else {
      grouped.set(clientName, [shipment]);
    }
  });
  return grouped;
};

export const RecentShipments: React.FC<RecentShipmentsProps> = ({ shipments, isLoading }) => {

  // Group shipments by client name using useMemo for performance
  const groupedShipments = useMemo(() => groupShipmentsByClient(shipments), [shipments]);

  // Convert Map to Array for easier rendering
  const clientGroups = useMemo(() => Array.from(groupedShipments.entries()), [groupedShipments]);

  return (
    <div className="bg-jdc-card p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
        <FontAwesomeIcon icon={faTruckFast} className="mr-2 text-jdc-yellow" />
        Envois CTN Récents
      </h2>
      {isLoading ? (
        <div className="text-center text-jdc-gray-400 py-4">Chargement...</div>
      ) : clientGroups.length === 0 ? (
        <div className="text-center text-jdc-gray-400 py-4">Aucun envoi récent trouvé.</div>
      ) : (
        <ul className="space-y-2">
          {clientGroups.map(([clientName, clientShipments]) => (
            <li key={clientName} className="bg-jdc-gray-800 rounded-md overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-jdc-gray-700 list-none">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faBuilding} className="mr-3 text-jdc-gray-300" />
                    <span className="font-medium text-white">{clientName}</span>
                    <span className="ml-2 text-sm text-jdc-gray-400">({clientShipments.length} envoi{clientShipments.length > 1 ? 's' : ''})</span>
                  </div>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="text-jdc-gray-400 transition-transform duration-200 group-open:rotate-90"
                  />
                </summary>
                <ul className="border-t border-jdc-gray-700 p-3 space-y-2">
                  {clientShipments.map((shipment) => {
                    const statusStyle = getShipmentStatusStyle(shipment.statutExpedition);
                    const truncatedArticle = shipment.articleNom && shipment.articleNom.length > 40
                      ? `${shipment.articleNom.substring(0, 37)}...`
                      : shipment.articleNom;

                    return (
                      <li key={shipment.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0 mr-2">
                          <span className="text-jdc-gray-300 block truncate" title={shipment.articleNom}>
                            {truncatedArticle || 'Article non spécifié'}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                            {shipment.statutExpedition || 'Inconnu'}
                          </span>
                           <span className="text-jdc-gray-500 ml-2 text-xs">
                             ({shipment.secteur || 'Secteur inconnu'})
                           </span>
                        </div>
                        {shipment.trackingLink && (
                          <Button
                            as="link"
                            to={shipment.trackingLink}
                            target="_blank" // Open in new tab
                            rel="noopener noreferrer" // Security best practice
                            variant="ghost"
                            size="sm"
                            className="!p-1" // Reduce padding for icon-only feel
                            title="Suivre le colis"
                          >
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="h-4 w-4 text-jdc-yellow" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
