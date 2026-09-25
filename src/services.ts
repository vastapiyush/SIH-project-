import type {CropObservation,Diagnosis,FarmerPreferences,MediaRecord,PossibleCondition,WeatherSnapshot,ChemicalApplication,WeatherHour} from './types';
import {demoDiagnosis} from './engine';
export const aiConfigured=Boolean(import.meta.env.VITE_DIAGNOSIS_ENDPOINT);
export async function prepareImage(file:File):Promise<MediaRecord>{
 if(!file.type.startsWith('image/')||file.size>15*1024*1024)throw Error('Choose an image smaller than 15 MB.');
 const bmp=await createImageBitmap(file);const issues:string[]=[];
 if(Math.min(bmp.width,bmp.height)<300)issues.push('Photo is too small. Move closer and take a higher-resolution photo.');
 const canvas=document.createElement('canvas');const scale=Math.min(1,1024/Math.max(bmp.width,bmp.height));canvas.width=Math.round(bmp.width*scale);canvas.height=Math.round(bmp.height*scale);const ctx=canvas.getContext('2d')!;ctx.drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();
 const small=document.createElement('canvas');small.width=128;small.height=128;const c=small.getContext('2d')!;c.drawImage(canvas,0,0,128,128);const pixels=c.getImageData(0,0,128,128).data;let light=0,edge=0;
 for(let i=0;i<pixels.length;i+=4){light+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;if(i>=512)edge+=Math.abs(pixels[i]-pixels[i-512]);}
 light/=128*128;edge/=128*127;
 if(light<30||light>238)issues.push('Lighting is too dark or washed out. Try even natural light.');
 if(edge<2)issues.push('Little detail is visible. Focus on the leaf and hold the camera steady.');
 return {dataUrl:canvas.toDataURL('image/jpeg',.78),quality:issues.length?'weak':'good',issues};
}
export function demoWeather(p:FarmerPreferences):WeatherSnapshot{
 const base=new Date();base.setMinutes(0,0,0);return{date:new Date().toISOString(),source:'demo',latitude:p.latitude,longitude:p.longitude,location:p.location,hours:Array.from({length:36},(_,i)=>{const d=new Date(+base+i*3600000),h=d.getHours();return{time:d.toISOString(),temperature:24+Math.round(7*Math.sin((h-6)*Math.PI/12)),humidity:65+Math.round(17*Math.cos(h*Math.PI/12)),wind:4+(i%5)*3,rain:i%11<3?65:12};})};
}
export async function fetchWeather(p:FarmerPreferences,cached?:WeatherSnapshot):Promise<WeatherSnapshot>{
 if(cached?.source==='live'&&cached.latitude===p.latitude&&cached.longitude===p.longitude&&Date.now()-new Date(cached.date).getTime()<30*60000)return cached;
 const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(p.latitude),longitude:String(p.longitude),hourly:'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m',timeformat:'unixtime',forecast_days:'3',timezone:'UTC'}).toString();
 const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Weather provider is unavailable. Your saved forecast is unchanged.');const j=await r.json();
 const h=j.hourly;if(!h||!Array.isArray(h.time))throw Error('Weather provider returned incomplete data.');
 const hours:WeatherHour[]=h.time.map((t:number,i:number)=>({time:new Date(t*1000).toISOString(),temperature:h.temperature_2m[i],humidity:h.relative_humidity_2m[i],wind:h.wind_speed_10m[i],rain:h.precipitation_probability[i]})).filter((x:WeatherHour)=>new Date(x.time).getTime()>=Date.now()-3600000&&[x.temperature,x.humidity,x.wind,x.rain].every(v=>typeof v==='number'&&Number.isFinite(v))).slice(0,48);
 if(hours.length<6)throw Error('Too few forecast hours to provide guidance.');return {source:'live',date:new Date().toISOString(),latitude:p.latitude,longitude:p.longitude,location:p.location,hours};
}
export interface SprayRules{minWind:number;maxWind:number;maxTemperature:number;minHumidity:number;maxRain:number;dryHours:number;labelChecked:boolean;beesAbsent:boolean;inversionAbsent:boolean;}
export const defaultSprayRules:SprayRules={minWind:3,maxWind:12,maxTemperature:30,minHumidity:40,maxRain:20,dryHours:4,labelChecked:false,beesAbsent:false,inversionAbsent:false};
export function sprayAssessment(w:WeatherSnapshot,r:SprayRules,now=Date.now()){
 return w.hours.filter(h=>new Date(h.time).getTime()>=now).slice(0,24).map(h=>{const reasons:string[]=[];const future=w.hours.filter(x=>+new Date(x.time)>=+new Date(h.time)&&+new Date(x.time)<+new Date(h.time)+r.dryHours*3600000);
 if(h.wind<r.minWind)reasons.push('Low wind: check for inversion and drift risk');if(h.wind>r.maxWind)reasons.push('Wind exceeds your limit');if(h.temperature>r.maxTemperature)reasons.push('Temperature exceeds your limit');if(h.humidity<r.minHumidity)reasons.push('Humidity below your limit');if(future.length<r.dryHours)reasons.push('Not enough forecast for drying period');if(future.some(x=>x.rain>r.maxRain))reasons.push('Rain risk during drying period');
 if(w.source==='demo')reasons.push('Sample forecast only');if(now-+new Date(w.date)>3*3600000)reasons.push('Forecast is stale');if(!r.labelChecked)reasons.push('Confirm product label limits');if(!r.beesAbsent)reasons.push('Confirm no active pollinators at application');if(!r.inversionAbsent)reasons.push('Confirm no temperature inversion at application');return {hour:h,suitable:reasons.length===0,reasons};});
}
export function validateAI(raw:unknown):{possibleConditions:PossibleCondition[];nextQuestion:string;immediateActions:string[];expertReviewNeeded:boolean;reasonForEscalation:string}{
 const r=raw as Record<string,unknown>;if(!r||typeof r!=='object'||!Array.isArray(r.possibleConditions)||r.possibleConditions.length<1||r.possibleConditions.length>3)throw Error('AI response is invalid. Your observation is retained.');
 const allowed=['disease','pest','nutrient','water','weather','unknown'];for(const c of r.possibleConditions){if(!c||typeof c.name!=='string'||c.name.length>200||!allowed.includes(c.type)||typeof c.confidence!=='number'||!Number.isFinite(c.confidence)||c.confidence<0||c.confidence>1||!Array.isArray(c.evidence)||c.evidence.some((e:unknown)=>typeof e!=='string')||!['low','medium','high'].includes(c.severity))throw Error('AI returned an invalid condition. Please retry.');}
 if(typeof r.nextQuestion!=='string'||!Array.isArray(r.immediateActions)||r.immediateActions.some(a=>typeof a!=='string')||typeof r.expertReviewNeeded!=='boolean'||typeof r.reasonForEscalation!=='string')throw Error('AI returned incomplete advice. Please retry.');
 return r as ReturnType<typeof validateAI>;
}
export async function diagnosisFingerprint(o:CropObservation,w?:WeatherSnapshot,chemicals:ChemicalApplication[]=[]){const {id,date,voiceNote,...context}=o;void id;void date;void voiceNote;const bytes=new TextEncoder().encode(JSON.stringify({context,weather:w,chemicals,endpoint:import.meta.env.VITE_DIAGNOSIS_ENDPOINT||'demo'}));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function runDiagnosis(o:CropObservation,w:WeatherSnapshot|undefined,chemicals:ChemicalApplication[],previous?:Diagnosis):Promise<Diagnosis>{
 const base=demoDiagnosis(o,previous,w);if(!aiConfigured)return base;
 if(o.image?.quality==='weak')throw Error('Retake the unclear photo before sending it for AI review.');
 const endpoint=import.meta.env.VITE_DIAGNOSIS_ENDPOINT;const url=new URL(endpoint,location.origin);if(url.protocol!=='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1')throw Error('Diagnosis endpoint must use HTTPS.');
 const payload={crop:o.crop,growthStage:o.growthStage,fieldSector:o.fieldSector,symptoms:o.symptoms,farmerDescription:o.farmerDescription,followUpAnswers:o.answers,weatherSummary:w?.source==='live'&&Date.now()-+new Date(w.date)<3*3600000?{date:w.date,hours:w.hours.slice(0,12)}:null,soilSummary:{type:o.soilType,drainage:o.drainage,moisture:o.moisture},recentTreatmentGroups:chemicals.filter(c=>c.fieldSector===o.fieldSector).slice(-10).map(c=>({ingredient:c.ingredient,group:c.group,date:c.date})),preferredLanguage:o.language,imageIncluded:!!o.image,image:o.image?.dataUrl};
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('AI review is unavailable. Your observation is retained; try again later.');const parsed=validateAI(await response.json());return {...base,source:'ai',conditions:parsed.possibleConditions,actions:parsed.immediateActions,nextQuestion:parsed.nextQuestion,expertReviewNeeded:parsed.expertReviewNeeded,reasonForEscalation:parsed.reasonForEscalation};
}
