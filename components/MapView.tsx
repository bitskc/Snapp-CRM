import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Lead } from '../types';
import { useCRM } from '../contexts/CRMContext';
import { Loader2, Globe, Map as MapIcon } from 'lucide-react';

declare const L: any;

interface MapViewProps {
    leads: Lead[];
    onLeadClick: (lead: Lead) => void;
}

const COLOR_MAP: Record<string, string> = {
    blue: '#60a5fa',
    green: '#4ade80',
    yellow: '#facc15',
    red: '#f87171',
    purple: '#c084fc',
    orange: '#fb923c',
    pink: '#f472b6',
    gray: '#94a3b8'
};

const hasCoords = (l: Lead) => l.latitude != null && l.longitude != null;
const needsCoords = (l: Lead) => l.latitude == null || l.longitude == null;

function buildPopupNode(
    lead: Lead,
    statusLabel: string,
    onClick: () => void
): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = 'cursor:pointer; min-width:180px; padding:4px 2px;';

    const title = document.createElement('strong');
    title.textContent = lead.companyName;
    title.style.cssText = 'display:block; font-size:14px; color:#1e293b; margin-bottom:4px;';

    const sub = document.createElement('span');
    sub.textContent = lead.location || lead.contactName || '';
    sub.style.cssText = 'display:block; font-size:11px; color:#64748b; margin-bottom:6px;';

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding-top:6px; border-top:1px solid #e2e8f0;';

    const pill = document.createElement('span');
    pill.textContent = statusLabel;
    pill.style.cssText = 'font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#475569; background:#f1f5f9; padding:2px 6px; border-radius:4px;';

    const cta = document.createElement('span');
    cta.textContent = 'View Details →';
    cta.style.cssText = 'font-size:11px; font-weight:600; color:#2563eb;';

    footer.append(pill, cta);
    root.append(title, sub, footer);

    root.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });

    return root;
}

export const MapView: React.FC<MapViewProps> = ({ leads, onLeadClick }) => {
    const { updateLead, settings } = useCRM();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [geocodingQueue, setGeocodingQueue] = useState<Lead[]>([]);
    const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
    const tileLayerRef = useRef<any>(null);
    const processedRef = useRef<Map<string, string>>(new Map());
    const initialFitRef = useRef(false);
    const geocodeInFlightRef = useRef(false);

    // Stable ref for onLeadClick to avoid marker rebuilds when callback changes
    const onLeadClickRef = useRef(onLeadClick);
    useEffect(() => { onLeadClickRef.current = onLeadClick; }, [onLeadClick]);

    // Identify leads needing geocoding
    useEffect(() => {
        const toGeocode = leads.filter(l =>
            l.location &&
            needsCoords(l) &&
            processedRef.current.get(l.id) !== l.location
        );

        if (toGeocode.length > 0) {
            setGeocodingQueue(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const news = toGeocode.filter(l => !existingIds.has(l.id));
                if (news.length === 0) return prev;
                return [...prev, ...news];
            });
        }
    }, [leads]);

    // Process geocoding queue one by one with in-flight guard
    useEffect(() => {
        if (geocodeInFlightRef.current) return;
        if (geocodingQueue.length === 0) return;

        geocodeInFlightRef.current = true;
        const lead = geocodingQueue[0];
        processedRef.current.set(lead.id, lead.location || '');

        (async () => {
            try {
                await updateLead(lead);
            } catch (e) {
                console.error("Geocoding failed for lead:", lead.companyName, e);
            } finally {
                setGeocodingQueue(prev => prev.slice(1));
                geocodeInFlightRef.current = false;
            }
        })();
    }, [geocodingQueue, updateLead]);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || !settings) return;
        if (mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false
        }).setView([39.8283, -98.5795], 4);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [settings]);

    // Tile layer switching
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        if (mapType === 'street') {
            tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                className: 'map-tiles-dark'
            }).addTo(map);
        } else {
            tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri'
            }).addTo(map);
        }
    }, [mapType]);

    // Update markers
    useEffect(() => {
        if (!mapInstanceRef.current || !settings) return;
        const map = mapInstanceRef.current;

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const leadsWithLocation = leads.filter(hasCoords);
        if (leadsWithLocation.length === 0) return;

        const bounds = L.latLngBounds([]);

        leadsWithLocation.forEach(lead => {
            const statusConfig = settings.statuses.find(s => s.id === lead.status);
            const colorName = statusConfig ? statusConfig.color : 'gray';
            const hexColor = COLOR_MAP[colorName] || '#94a3b8';

            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${hexColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            const statusLabel = statusConfig?.label || lead.status;
            const popupNode = buildPopupNode(lead, statusLabel, () => {
                map.closePopup();
                onLeadClickRef.current(lead);
            });

            const marker = L.marker([lead.latitude, lead.longitude], { icon: customIcon })
                .addTo(map)
                .bindPopup(popupNode, { closeButton: false });

            marker.bindTooltip(lead.companyName, {
                direction: 'top',
                offset: [0, -10]
            });

            markersRef.current.push(marker);
            bounds.extend([lead.latitude, lead.longitude]);
        });

        if (leadsWithLocation.length > 0 && !initialFitRef.current) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
            initialFitRef.current = true;
        }
    }, [leads, settings]);

    if (!settings) return null;

    return (
        <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
            <div ref={mapContainerRef} className="w-full h-full z-0" id="map" />

            <div className="absolute top-4 left-4 z-[400] bg-slate-950/90 backdrop-blur border border-slate-800 p-1 rounded-lg shadow-2xl flex gap-1">
                <button
                    onClick={() => setMapType('street')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'street' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <MapIcon size={14} /> Basic
                </button>
                <button
                    onClick={() => setMapType('satellite')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'satellite' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Globe size={14} /> Satellite
                </button>
            </div>

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
                {settings.statuses.map(s => {
                    const hex = COLOR_MAP[s.color] || '#94a3b8';
                    return (
                        <div key={s.id} className="flex items-center gap-2 text-slate-300">
                            <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: hex }}></div> {s.label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
