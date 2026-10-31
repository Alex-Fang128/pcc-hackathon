import fs from 'node:fs';
import {LAUNCH_SITES} from '../src/launch-sites.ts';
import {PCC,SPOTS} from '../src/data.ts';
import {bearingDegrees,distanceMeters} from '../src/geo.ts';
import {normalizeLaunch,forecastSample,launchDateLabel,youtubeEmbedUrl} from '../src/launch-data.ts';

const report={checkedAt:new Date().toISOString(),sources:{},launches:{},worldSites:[],videos:[],location:{campus:PCC,candidates:SPOTS.map(s=>({name:s.name,lat:s.lat,lng:s.lng,verifiedSightline:false})),deviceAccuracy:'Not tested: requires a device location permission and an on-site check.'}};
async function request(url,json=true){
  const response=await fetch(url,{headers:{Origin:'http://127.0.0.1:5173'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return {data:json?await response.json():await response.text(),cors:response.headers.get('access-control-allow-origin'),status:response.status,url};
}
const urls={upcoming:'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=5&mode=detailed&location__ids=11&ordering=net',previous:'https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=5&mode=detailed&location__ids=11&ordering=-net',sites:'https://planet4589.org/space/gcat/tsv/tables/sites.tsv'};
const savedOnly=process.argv.includes('--use-saved-launches');
const prior=savedOnly?JSON.parse(fs.readFileSync('outputs/data-validation.json','utf8')):null;
const initial=await Promise.allSettled(savedOnly?[Promise.reject(new Error('HTTP 429; not retried during rate limit')),Promise.reject(new Error('HTTP 429; not retried during rate limit')),Promise.resolve({data:fs.readFileSync('work/sites-audit.tsv','utf8'),status:200,cors:null})]:[request(urls.upcoming),request(urls.previous),request(urls.sites,false)]);
const records={};
for(const [index,kind] of ['upcoming','previous','sites'].entries()){
  const result=initial[index];if(result.status==='rejected'){report.sources[kind]={url:urls[kind],error:result.reason.message};continue;}
  report.sources[kind]={url:urls[kind],status:result.value.status,cors:result.value.cors};
  if(kind==='sites'){fs.writeFileSync('work/sites-audit.tsv',result.value.data);records.sites=result.value.data;continue;}
  fs.writeFileSync(`work/${kind}-audit.json`,JSON.stringify(result.value.data));
  records[kind]=result.value.data.results.map(normalizeLaunch).filter(Boolean);
  report.launches[kind]=records[kind].map(launch=>({id:launch.id,name:launch.name,net:launch.net,display:launchDateLabel(launch),status:launch.status,pad:launch.pad,source:launch.sourceUrl,withinPublishedWindow:!launch.windowStart||!launch.windowEnd?null:Date.parse(launch.net)>=Date.parse(launch.windowStart)&&Date.parse(launch.net)<=Date.parse(launch.windowEnd)}));
}
const snapshot=JSON.parse(fs.readFileSync('src/launch-snapshot.json','utf8'));
for(const kind of ['upcoming','previous'])if(!records[kind]){
  records[kind]=snapshot[kind];
  report.sources[kind]={...report.sources[kind],fallback:'saved snapshot',snapshotSavedAt:new Date(snapshot.checkedAt).toISOString()};
  report.launches[kind]=records[kind].map(launch=>({id:launch.id,name:launch.name,net:launch.net,display:launchDateLabel(launch),status:launch.status,pad:launch.pad,source:launch.sourceUrl,withinPublishedWindow:!launch.windowStart||!launch.windowEnd?null:Date.parse(launch.net)>=Date.parse(launch.windowStart)&&Date.parse(launch.net)<=Date.parse(launch.windowEnd)}));
}
if(prior)report.sources.sites.previousLiveCheckAt=prior.checkedAt;
if(records.sites){
  const rows=records.sites.split('\n').filter(s=>!s.startsWith('#')).map(s=>s.split('\t'));
  const sourceCodes=['VSFBS','CCSFS','KSC','STB','WI','PSCA','CSG','ALCA','AND','GIK-1','GIK-5','VOST','JQ','TYSC','XSC','WEN','HCSLS','SDSC','TNSC','USC','NARO','SOHAE','SEM','SHAHR','PALB','MAHIA','BOWEN'];
  LAUNCH_SITES.forEach((site,index)=>{
    const row=rows.find(r=>r[0]===sourceCodes[index]);
    const reference=row?{lat:Number(row[11]),lng:Number(row[10])}:null;
    const differenceMeters=reference?distanceMeters(site,reference):null;
    report.worldSites.push({name:site.name,sourceCode:sourceCodes[index],reference,differenceMeters,pass:typeof differenceMeters==='number'&&differenceMeters<1000});
  });
}
const all=[...(records.upcoming??[]),...(records.previous??[])];
const casts=[...new Map(all.flatMap(launch=>launch.webcasts.filter(cast=>youtubeEmbedUrl(cast.url)).map(cast=>[cast.url,{...cast,mission:launch.mission}]))).values()];
const videos=await Promise.allSettled(casts.map(async cast=>{
  try{const result=await request(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(cast.url)}`);return {...cast,status:result.status,title:result.data.title,author:result.data.author_name,oembedProvidesPlayer:typeof result.data.html==='string'&&result.data.html.includes('iframe'),playbackVerified:false};}
  catch(error){return {...cast,error:error.message,playbackVerified:false};}
}));
report.videos=videos.map(result=>result.status==='fulfilled'?result.value:{error:result.reason.message});
const next=records.upcoming?.[0];
if(next){
  report.geometry={distanceKm:distanceMeters(PCC,next.pad)/1000,bearingDegrees:bearingDegrees(PCC,next.pad),pad:next.pad};
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${PCC.lat},${next.pad.lat}&longitude=${PCC.lng},${next.pad.lng}&hourly=cloud_cover&forecast_days=16&timeformat=unixtime&timezone=UTC`;
    const weather=await request(url);
    report.weather={status:weather.status,cors:weather.cors,campus:forecastSample(weather.data[0]?.hourly,Date.parse(next.net)),pad:forecastSample(weather.data[1]?.hourly,Date.parse(next.net)),sendsDeviceCoordinates:false};
  }catch(error){report.weather={error:error.message};}
}
fs.writeFileSync('outputs/data-validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({sources:report.sources,nextLaunch:report.launches.upcoming?.[0],worldSitesPassed:report.worldSites.filter(s=>s.pass).length,worldSitesChecked:report.worldSites.length,videos:report.videos.map(v=>({mission:v.mission,status:v.status,title:v.title,error:v.error})),geometry:report.geometry,weather:report.weather},null,2));
