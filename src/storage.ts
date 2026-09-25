import type { AppData } from './types';
export const defaults=():AppData=>({preferences:{language:'en',location:'Pune',latitude:18.52,longitude:73.85,weatherMode:'demo'},fields:[{id:'main',name:'My farm'}],sectors:[{id:'north',fieldId:'main',name:'North field'},{id:'south',fieldId:'main',name:'South field'}],diagnoses:[],chemicals:[],outcomes:[],queue:[]});
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('crop-health',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function load():Promise<AppData>{const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction('data','readonly');const r=t.objectStore('data').get('state');r.onsuccess=()=>resolve(r.result??defaults());r.onerror=()=>reject(r.error);t.oncomplete=()=>db.close();});}
export async function save(data:AppData){const db=await open();return new Promise<void>((resolve,reject)=>{const t=db.transaction('data','readwrite');t.objectStore('data').put(data,'state');t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>{db.close();reject(t.error);};});}
export function validateImport(raw:unknown):AppData {
 if(!raw||typeof raw!=='object')throw Error('Choose a Crop Health JSON backup.');
 const envelope=raw as {version?:number;data?:AppData}; const d=envelope.data;
 if(envelope.version!==1||!d||!d.preferences||!['en','hi','mr'].includes(d.preferences.language))throw Error('Backup format or language is not supported.');
 for(const key of ['fields','sectors','diagnoses','chemicals','outcomes','queue'] as const)if(!Array.isArray(d[key])||d[key].some(x=>!x||typeof x.id!=='string'))throw Error('Invalid records in '+key);
 if(d.diagnoses.some(x=>!x.observation||!x.score||!Number.isFinite(x.score.value)||!Array.isArray(x.conditions)||!Array.isArray(x.actions)||!Array.isArray(x.treatments)||!['demo','ai'].includes(x.source)))throw Error('Invalid diagnosis data.');
 if(d.sectors.some(x=>typeof x.name!=='string'||typeof x.fieldId!=='string')||d.chemicals.some(x=>typeof x.ingredient!=='string'||typeof x.group!=='string'||typeof x.fieldSector!=='string'))throw Error('Invalid field or treatment records.');
 if(d.outcomes.some(x=>!['improved','same','worse'].includes(x.outcome)||typeof x.diagnosisId!=='string')||d.queue.some(x=>!x.observation))throw Error('Invalid feedback or pending request.');
 if(!Number.isFinite(d.preferences.latitude)||!Number.isFinite(d.preferences.longitude)||Math.abs(d.preferences.latitude)>90||Math.abs(d.preferences.longitude)>180)throw Error('Invalid location.');
 return d;
}
