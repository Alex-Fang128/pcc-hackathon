import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import MapView from '../src/MapView';
import type {ReportedLocation} from '../src/MapView';
import 'leaflet/dist/leaflet.css';
import '../src/styles.css';
import '../src/dark-sky.css';
import '../src/responsive.css';
function Preview(){
  const [location,setLocation]=useState<ReportedLocation|null>(null);
  const [selected,setSelected]=useState('quad');
  return <main style={{padding:'24px',maxWidth:1100,margin:'auto'}}>
    <h1 style={{fontSize:24,marginBottom:10}}>Current-location pin preview</h1>
    <p style={{marginBottom:16}}>Simulated public coordinates for testing. This is not a device location.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
      <button className="location-button" onClick={()=>setLocation({lat:34.1442,lng:-118.1187,accuracy:25})}>Simulate campus location</button>
      <button className="location-button" onClick={()=>setLocation({lat:34.05,lng:-118.24,accuracy:200})}>Simulate distant location</button>
      <button className="location-button" onClick={()=>setLocation(null)}>Clear location</button>
    </div>
    <div className="map-shell"><MapView location={location} selected={selected} onSelect={setSelected}/></div>
    <p role="status" style={{marginTop:16}}>{location?`Simulated accuracy: ${location.accuracy} m`:'Location is off; no user pin should appear.'}</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Preview/></React.StrictMode>);
