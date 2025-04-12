import type { MetaFunction } from "@remix-run/node";
import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "@remix-run/react";
import { getAllShipmentsSdk, getUserProfile } from "~/services/firestore.service";
import type { Shipment, UserProfile, AppUser } from "~/types/firestore.types";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruckFast, faFilter, faSearch, faBuilding, faChevronDown, faChevronRight, faExternalLinkAlt, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { getShipmentStatusStyle } from "~/utils/styleUtils";

export const meta: MetaFunction = () => {
  return [{ title: "Envois CTN | JDC Dashboard" }];
};

// Define the type for the context provided by the root Outlet
type OutletContextType = {
  user: AppUser | null;
};

// Helper to group shipments (same as in RecentShipments)
const groupShipmentsByClient = (shipments: Shipment[]): Map<string, Shipment[]> => {
  const grouped = new Map<string, Shipment[]>();
   if (!Array.isArray(shipments)) {
     return grouped;
   }
  shipments.forEach(shipment => {
    const clientName = shipment.nomClient || 'Client Inconnu';
    const existing = grouped.get(clientName);
    if (existing) {
      existing.push(shipment);
    } else {
      grouped.set(clientName, [shipment]);
    }
  });
  return grouped;
};

export default function EnvoisCtn() {
  const { user } = useOutletContext<OutletContextType>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSector, setSelectedSector] = useState<string>(''); // '' means all accessible sectors
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch user profile and all shipments on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        console.log("Envois CTN: No user found, waiting for auth.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Fetch profile first (optional, could be fetched elsewhere if needed globally)
        // const profile = await getUserProfile(user.uid);
        // setUserProfile(profile);
        // console.log("Envois CTN: User profile fetched:", profile);

        // Fetch all accessible shipments (rules handle filtering)
        const shipments = await getAllShipmentsSdk();
        setAllShipments(shipments);
        console.log(`Envois CTN: Fetched ${shipments.length} shipments.`);

      } catch (err: any) {
        console.error("Error fetching data for Envois CTN:", err);
        setError(`Erreur de chargement des données: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]); // Re-fetch if user changes

  // Filter and group shipments based on selected sector and search term
  const filteredAndGroupedShipments = useMemo(() => {
    let filtered = allShipments;

    // 1. Filter by Sector
    if (selectedSector && selectedSector !== '') {
      filtered = filtered.filter(s => s.secteur === selectedSector);
    }

    // 2. Filter by Search Term
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(s =>
        (s.nomClient && s.nomClient.toLowerCase().includes(lowerSearchTerm)) ||
        (s.codeClient && s.codeClient.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // 3. Group by Client Name
    return groupShipmentsByClient(filtered);
  }, [allShipments, selectedSector, searchTerm]);

  // Convert Map to Array for rendering
  const clientGroups = useMemo(() => {
      // Optionally sort client groups alphabetically by client name
      const sortedEntries = Array.from(filteredAndGroupedShipments.entries())
                                .sort((a, b) => a[0].localeCompare(b[0]));
      return sortedEntries;
  }, [filteredAndGroupedShipments]);

  // Available sectors for filtering - derived from the fetched shipments
  const availableSectors = useMemo(() => {
    // Use the raw allShipments before filtering/grouping to get all possible sectors
    const uniqueSectors = new Set(allShipments.map(s => s.secteur).filter(Boolean));
    return Array.from(uniqueSectors).sort();
  }, [allShipments]); // Depends only on the initially fetched shipments

  // Handle case where user is not logged in yet
  if (!user && !isLoading) {
     return (
        <div className="text-center text-jdc-gray-400 py-10">
            Veuillez vous connecter pour voir les envois.
        </div>
     )
  }


  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-4 flex items-center">
        <FontAwesomeIcon icon={faTruckFast} className="mr-3 text-jdc-yellow" />
        Suivi des Envois CTN
      </h1>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-jdc-card rounded-lg shadow">
        {/* Sector Filter */}
        <div className="col-span-1">
          <label htmlFor="sector-filter" className="block text-sm font-medium text-jdc-gray-300 mb-1">
            <FontAwesomeIcon icon={faFilter} className="mr-1" /> Filtrer par Secteur
          </label>
          <select
            id="sector-filter"
            name="sector-filter"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="block w-full rounded-md bg-jdc-gray-800 border-transparent focus:border-jdc-yellow focus:ring focus:ring-jdc-yellow focus:ring-opacity-50 text-white py-2 pl-3 pr-10"
            disabled={isLoading || availableSectors.length === 0}
          >
            <option value="">Tous les secteurs</option> {/* Changed text slightly */}
            {availableSectors.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
           {availableSectors.length === 0 && !isLoading && allShipments.length > 0 && (
             <p className="text-xs text-jdc-gray-500 mt-1">Aucun secteur trouvé dans les envois.</p>
           )}
           {/* Show message if loading or if no shipments were found at all */}
           {availableSectors.length === 0 && !isLoading && allShipments.length === 0 && (
             <p className="text-xs text-jdc-gray-500 mt-1">Aucun envoi accessible trouvé.</p>
           )}
        </div>

        {/* Search Input */}
        <div className="col-span-1 md:col-span-2">
           <Input
             label="Rechercher par Nom ou Code Client"
             id="search-client"
             name="search-client"
             placeholder="Entrez un nom ou code client..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             icon={<FontAwesomeIcon icon={faSearch} />}
             wrapperClassName="mb-0"
             disabled={isLoading}
           />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center text-jdc-gray-400 py-10">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl mr-2" />
          Chargement des envois...
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center text-red-400 bg-red-900 bg-opacity-50 p-4 rounded-lg">{error}</div>
      )}

      {/* No Results State (after filtering/searching) */}
      {!isLoading && !error && clientGroups.length === 0 && allShipments.length > 0 && (
        <div className="text-center text-jdc-gray-400 py-10">
          Aucun envoi trouvé correspondant à votre recherche ou filtre.
        </div>
      )}
      {/* No Results State (initial load, no shipments found at all) */}
       {!isLoading && !error && allShipments.length === 0 && (
         <div className="text-center text-jdc-gray-400 py-10">
           Aucun envoi accessible trouvé pour votre compte.
         </div>
       )}


      {/* Shipments List */}
      {!isLoading && !error && clientGroups.length > 0 && (
        <div className="space-y-3">
          {clientGroups.map(([clientName, clientShipments]) => (
            <div key={clientName} className="bg-jdc-card rounded-lg shadow overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-jdc-gray-800 list-none transition-colors">
                  <div className="flex items-center min-w-0 mr-2">
                    <FontAwesomeIcon icon={faBuilding} className="mr-3 text-jdc-gray-300 text-lg flex-shrink-0" />
                    <div className="min-w-0">
                        <span className="font-semibold text-white text-lg block truncate" title={clientName}>{clientName}</span>
                        <span className="ml-0 md:ml-3 text-sm text-jdc-gray-400">
                            ({clientShipments.length} envoi{clientShipments.length > 1 ? 's' : ''})
                        </span>
                         {/* Optionally display codeClient if available and different from name */}
                         {clientShipments[0]?.codeClient && clientShipments[0].codeClient !== clientName && (
                            <span className="block text-xs text-jdc-gray-500 truncate" title={`Code: ${clientShipments[0].codeClient}`}>Code: {clientShipments[0].codeClient}</span>
                         )}
                    </div>
                  </div>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="text-jdc-gray-400 transition-transform duration-200 group-open:rotate-90 text-xl flex-shrink-0"
                  />
                </summary>
                <div className="border-t border-jdc-gray-700 bg-jdc-gray-900 p-4 space-y-3">
                  {clientShipments.map((shipment) => {
                    const statusStyle = getShipmentStatusStyle(shipment.statutExpedition);
                    const truncatedArticle = shipment.articleNom && shipment.articleNom.length > 50
                      ? `${shipment.articleNom.substring(0, 47)}...`
                      : shipment.articleNom;

                    return (
                      <div key={shipment.id} className="flex items-center justify-between text-sm border-b border-jdc-gray-700 pb-2 last:border-b-0">
                        <div className="flex-1 min-w-0 mr-3">
                          <span className="text-jdc-gray-200 block font-medium truncate" title={shipment.articleNom}>
                            {truncatedArticle || 'Article non spécifié'}
                          </span>
                          <div className="flex items-center flex-wrap mt-1 space-x-2">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                                {shipment.statutExpedition || 'Inconnu'}
                              </span>
                              <span className="text-jdc-gray-500 text-xs whitespace-nowrap">
                                ID: {shipment.id}
                              </span>
                               <span className="text-jdc-gray-500 text-xs whitespace-nowrap">
                                 Secteur: {shipment.secteur || 'N/A'}
                               </span>
                               {/* REMOVED: Display of dateCreation as it's not available */}
                               {/*
                               {shipment.dateCreation && (
                                 <span className="text-jdc-gray-500 text-xs whitespace-nowrap">
                                    Créé le: {new Date(shipment.dateCreation).toLocaleDateString()}
                                 </span>
                               )}
                               */}
                          </div>
                        </div>
                        {shipment.trackingLink && (
                          <Button
                            as="link"
                            to={shipment.trackingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="secondary"
                            size="sm"
                            title="Suivre le colis"
                            leftIcon={<FontAwesomeIcon icon={faExternalLinkAlt} />}
                            className="flex-shrink-0"
                          >
                            Suivi
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
