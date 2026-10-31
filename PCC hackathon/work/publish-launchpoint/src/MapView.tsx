import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PCC, SPOTS } from './data';
import type { Point } from './geo';
export type ReportedLocation = Point & { accuracy: number };

function fitView(instance:L.Map, element:HTMLDivElement|null, location:ReportedLocation|null) {
  const bounds=L.latLngBounds(SPOTS.map(spot=>[spot.lat,spot.lng] as [number,number]));
  if(location)bounds.extend([location.lat,location.lng]);
  const side=Math.min(65,(element?.clientWidth??320)*.16);
  instance.fitBounds(bounds,{paddingTopLeft:[side,95],paddingBottomRight:[side,75],maxZoom:17,animate:false});
}

export default function MapView({ selected, location, onSelect }: { selected: string; location: ReportedLocation | null; onSelect: (id: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const currentLocation = useRef(location);
  currentLocation.current = location;
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { zoomControl: false, scrollWheelZoom: false });
    fitView(instance,element.current,currentLocation.current);
    map.current = instance;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance);
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    L.polygon([[34.1413,-118.121],[34.1455,-118.121],[34.1455,-118.1164],[34.1413,-118.1164]], { color:'#398575', weight:1, dashArray:'5 7', fillColor:'#8dd6b5', fillOpacity:0.06, interactive:false }).addTo(instance);
    const resize = new ResizeObserver(() => {
      instance.invalidateSize();
      fitView(instance,element.current,currentLocation.current);
    });
    resize.observe(element.current);
    return () => { resize.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach(marker => marker.remove());
    markers.current = SPOTS.map((spot, i) => {
      const marker = L.marker([spot.lat, spot.lng], { icon: L.divIcon({ className:'spot-pin', html:`<span class="${spot.id === selected ? 'active' : ''}">${i + 1}</span>`, iconSize:[36,36], iconAnchor:[18,18] }), title: spot.name, alt: `Select ${spot.name}`, keyboard:true }).addTo(instance);
      const element = marker.getElement();
      element?.setAttribute('aria-label', `Select ${spot.name}`);
      element?.addEventListener('click', () => onSelect(spot.id));
      element?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(spot.id);
        }
      });
      return marker;
    });
  }, [selected, onSelect]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    fitView(instance,element.current,location);
    if (!location) return;
    const layers=L.layerGroup().addTo(instance);
    const hasAccuracy=Number.isFinite(location.accuracy)&&location.accuracy>0;
    if(hasAccuracy)L.circle([location.lat,location.lng],{radius:location.accuracy,color:'#5aabff',weight:1,fillColor:'#4a9fff',fillOpacity:.14,interactive:false}).addTo(layers);
    const pin=L.marker([location.lat,location.lng],{
      icon:L.divIcon({className:'user-location-pin',html:'<span></span>',iconSize:[28,28],iconAnchor:[14,14]}),
      title:'Your current location',alt:'Your current location',keyboard:true,zIndexOffset:1000
    }).addTo(layers);
    pin.bindTooltip('You are here',{permanent:true,direction:'top',offset:[0,-19],className:'user-location-label'});
    pin.bindPopup(`Your reported location${hasAccuracy?`<br>Accuracy: about ${Math.round(location.accuracy)} m`:''}`);
    pin.getElement()?.setAttribute('aria-label','Your current location');
    return () => { layers.remove(); };
  }, [location]);
  return <><div className="leaflet-map" ref={element} aria-label="Interactive PCC map with three approximate candidate viewing spots" />{tileError && <div className="map-error" role="status">Map tiles unavailable. Candidate spots are still listed below.</div>}</>;
}
