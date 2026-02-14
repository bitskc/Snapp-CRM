import React, { useEffect, useRef, useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { saveLead } from '../services/crmService';
import { Loader2 } from 'lucide-react';

// Declare Leaflet global
declare const L: any;

interface MapViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export const MapView: React.FC<MapViewProps> = ({ leads, onLeadClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [geocodingQueue, setGeocodingQueue] = useState<Lead[]>([]);

  // Identify leads that have location but no coordinates and need geocoding
  useEffect(() => {
    const toGeocode = leads.filter(l => l.location && (!l.latitude || !l.longitude));
    if (toGeocode.length > 0) {
        setGeocodingQueue(toGeocode);
    }
  }, [leads]);

  // Process geocoding queue one by one to respect free API limits (1 req/sec roughly)
  useEffect(() => {
      if (geocodingQueue.length === 0) return;

      const processQueue = async () => {
          const lead = geocodingQueue[0];
          // Call saveLead, which handles the geocoding logic internally now
          // We trigger a "save" which fetches coords and updates DB
          await saveLead(lead);
          
          // Remove from queue after delay
          setTimeout(() => {
              setGeocodingQueue(prev => prev.slice(1));
          }, 1100); 
      };

      processQueue();
  }, [geocodingQueue]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    // Default view: USA center roughly
    const map = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4);

    // Add Dark Mode styled OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: 'map-tiles-dark' 
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  // Update Markers
  useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      const leadsWithLocation = leads.filter(l => l.latitude && l.longitude);
      
      if (leadsWithLocation.length === 0) return;

      const bounds = L.latLngBounds([]);

      leadsWithLocation.forEach(lead => {
          // Determine color based on status
          let color = '#94a3b8'; // slate (default)
          if (lead.status === LeadStatus.COLD) color = '#60a5fa'; // blue
          if (lead.status === LeadStatus.WARM) color = '#facc15'; // yellow
          if (lead.status === LeadStatus.LIVE) color = '#4ade80'; // green
          if (lead.status === LeadStatus.DEAD) color = '#f87171'; // red

          // Custom Marker Icon (simple html div)
          const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          const marker = L.marker([lead.latitude, lead.longitude], { icon: customIcon })
            .addTo(map)
            .bindPopup(`
                <div class="text-slate-900 text-sm">
                    <strong>${lead.companyName}</strong><br/>
                    ${lead.location}<br/>
                    <span class="text-xs font-bold text-slate-500">${lead.status}</span>
                </div>
            `);
          
          // Handle Click
          marker.on('click', () => {
              onLeadClick(lead);
          });
          
          // Hover tooltip
          marker.bindTooltip(lead.companyName, {
              direction: 'top',
              offset: [0, -10],
              className: 'bg-slate-800 text-white border-slate-700 px-2 py-1 rounded shadow-lg'
          });

          markersRef.current.push(marker);
          bounds.extend([lead.latitude, lead.longitude]);
      });

      // Fit bounds if we have markers
      if (leadsWithLocation.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
      }

  }, [leads, onLeadClick]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full z-0" id="map" />
        
        {/* Geocoding Status Indicator */}
        {geocodingQueue.length > 0 && (
            <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-xl flex items-center gap-3">
                <Loader2 className="animate-spin text-brand-400" size={16} />
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Mapping Locations...</span>
                    <span className="text-[10px] text-slate-400">{geocodingQueue.length} remaining</span>
                </div>
            </div>
        )}

        <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-lg shadow-xl text-xs space-y-1">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400 border border-white"></div> Cold</div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400 border border-white"></div> Warm</div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 border border-white"></div> Live</div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400 border border-white"></div> Dead</div>
        </div>
    </div>
  );
};