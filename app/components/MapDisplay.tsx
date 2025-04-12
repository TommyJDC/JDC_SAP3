import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from '@remix-run/react';

// Dynamically import Leaflet only on the client-side
let L: typeof import('leaflet') | null = null;
if (typeof window !== 'undefined') {
  import('leaflet').then(leaflet => {
    L = leaflet;
  });
}

interface MapDisplayProps {
  position: [number, number]; // Latitude, Longitude
  zoom?: number;
  className?: string;
  markers?: Array<{ position: [number, number]; popupContent?: string }>;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
  position,
  zoom = 13,
  className = '',
  markers = [],
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(L !== null);
  const location = useLocation(); // Use location to trigger re-render on navigation

  useEffect(() => {
    // Ensure Leaflet is loaded before trying to initialize the map
    if (!isLeafletLoaded && typeof window !== 'undefined') {
      import('leaflet').then(leaflet => {
        L = leaflet;
        setIsLeafletLoaded(true);
      });
    }
  }, [isLeafletLoaded]);

  useEffect(() => {
    // Initialize map only if Leaflet is loaded, ref exists, and map isn't already initialized
    if (isLeafletLoaded && L && mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(position, zoom);

      // Add Tile Layer (Using OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);

      // Add initial markers
      markers.forEach(markerInfo => {
        const marker = L!.marker(markerInfo.position).addTo(mapInstanceRef.current!);
        if (markerInfo.popupContent) {
          marker.bindPopup(markerInfo.popupContent);
        }
      });

      // Optional: Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }

    // Cleanup function to remove map instance when component unmounts or location changes
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Re-run effect if Leaflet loads, position changes, or location changes
  }, [isLeafletLoaded, position, zoom, markers, location.key]);

  // Update map view and markers if props change after initial render
  useEffect(() => {
     if (mapInstanceRef.current && L) {
       mapInstanceRef.current.setView(position, zoom);

       // Clear existing markers (simple approach, might need optimization for many markers)
       mapInstanceRef.current.eachLayer((layer) => {
         if (layer instanceof L!.Marker) {
           mapInstanceRef.current?.removeLayer(layer);
         }
       });

       // Add new markers
       markers.forEach(markerInfo => {
         const marker = L!.marker(markerInfo.position).addTo(mapInstanceRef.current!);
         if (markerInfo.popupContent) {
           marker.bindPopup(markerInfo.popupContent);
         }
       });
     }
  }, [position, zoom, markers, isLeafletLoaded]);


  return (
    <div
      ref={mapRef}
      className={`leaflet-container ${className}`} // Ensure leaflet-container class is present
      style={{ height: '400px', width: '100%', backgroundColor: '#333' }} // Default size and bg
    >
      {!isLeafletLoaded && <p className="p-4 text-center text-jdc-gray-400">Chargement de la carte...</p>}
    </div>
  );
};
