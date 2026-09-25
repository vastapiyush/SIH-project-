import type { CropObservation, Diagnosis, PossibleCondition, PlantHealthScore, ChemicalApplication, WeatherSnapshot, OutcomeFeedback, TreatmentRecommendation, OutbreakWarning } from './types';
export const symptoms=['Yellow leaves','Brown spots or rings','Wilting','Visible insects','Chewed leaves','White powder','Stunted growth','Dry leaf edges'];
export const questions=[{id:'lower',text:'Are the lower leaves turning yellow first?'},{id:'mushy',text:'Is the stem soft or mushy?'},{id:'roots',text:'Are the roots brown or rotten?'},{id:'waterlogged',text:'Did it begin in a waterlogged patch?'}];
export const scoreWeights={severity:8,affected:.3,waterlogged:12,weather:6};
export function healthScore(o:CropObservation,previous?:Diagnosis):PlantHealthScore{
 const reasons:string[]=[];let penalty=o.severity*scoreWeights.severity+o.affected*scoreWeights.affected;
 if(o.symptoms.length)reasons.push(`${o.symptoms.length} symptom${o.symptoms.length===1?'':'s'} reported`);
 reasons.push(`${o.affected}% of plants reported affected`);
 if(o.drainage==='Poor'||o.moisture==='Waterlogged'){penalty+=scoreWeights.waterlogged;reasons.push('Poor drainage or waterlogging reported');}
 const value=Math.max(0,Math.min(100,Math.round(100-penalty)));const weak=!o.image||o.image.quality==='weak';
 const delta=previous?value-previous.score.value:0;
 return {value,range:[Math.max(0,value-(weak?12:6)),Math.min(100,value+(weak?12:6))],band:value>=80?'Monitor routinely':value>=60?'Keep watch':value>=40?'Needs attention':'Urgent review',confidence:weak?'Low':'Limited',reasons:reasons.slice(0,3),trend:previous?(delta>3?'Improving':delta< -3?'Worsening':'Stable'):'First observation'};
}
export function demoDiagnosis(o:CropObservation,previous?:Diagnosis,weather?:WeatherSnapshot):Diagnosis{
 const text=(o.symptoms.join(' ')+' '+o.farmerDescription).toLowerCase(); const candidates:PossibleCondition[]=[];
 const add=(name:string,type:PossibleCondition['type'],confidence:number,evidence:string[])=>candidates.push({name,type,confidence,evidence,severity:o.severity>=3?'high':o.severity===2?'medium':'low'});
 const rot=o.answers.mushy==='Yes'||o.answers.roots==='Yes'||o.answers.waterlogged==='Yes'||o.moisture==='Waterlogged';
 if(/yellow|पीले|पिवळ/.test(text)){add('Nutrient deficiency','nutrient',o.answers.lower==='Yes'&&!rot?.62:.38,['Yellowing reported','Soil testing is needed to identify a deficiency']);add('Root stress or root rot','disease',rot?.68:.35,[rot?'Root or waterlogging concern reported':'Root condition is not confirmed']);}
 if(/spot|ring|brown|डाग|धब्ब/.test(text))add('Leaf spot disease','disease',.54,['Spots or rings reported','Several infections can look similar']);
 if(/insect|chewed|कीट|कीड/.test(text))add('Insect feeding damage','pest',.6,['Insects or chewed leaves reported','Pest species and life stage need visual confirmation']);
 if(/powder/.test(text))add('Powdery mildew or leaf residue','disease',.5,['White powder reported','Residue can resemble infection']);
 if(/wilt|dry|मुरझ|वाळ/.test(text))add(rot?'Root stress':'Water or heat stress',rot?'disease':'water',.52,['Wilting or dry edges reported']);
 if(!candidates.length)add('Cause not established','unknown',.1,['No recognizable symptom pattern','More observations or expert review needed']);
 candidates.sort((a,b)=>b.confidence-a.confidence);
 const actions=['Inspect the underside of leaves and the stem. Compare an affected plant with a healthy one.','Check soil moisture and drainage before changing watering.','Keep a record of affected plants and arrange local agronomist advice if symptoms spread.'];
 const treatments:TreatmentRecommendation[]=[{title:'Inspect and monitor',purpose:'Collect evidence before treating',priority:'Today',expected:'A clearer picture of spread and severity',precautions:'Avoid moving soil or plant material between fields.',reassess:'Recheck within 24–48 hours, sooner if worsening.',expert:o.severity>=3},{title:rot?'Check drainage':'Check watering and soil',purpose:'Identify a possible environmental cause',priority:'Today',expected:'Reduce avoidable root or water stress',precautions:'Do not add fertilizer or pesticide based only on leaf colour.',reassess:'Record observations at the next field check.',expert:rot},{title:'Confirm before selecting a product',purpose:'Choose suitable cultural, biological or chemical control',priority:'Before treatment',expected:'Avoid unnecessary or unsuitable chemical use',precautions:'Use locally registered labels, crop restrictions, PPE, re-entry and harvest intervals. No dose is inferred here.',reassess:'Follow the confirmed diagnosis and product label.',expert:true}];
 return {id:o.id,observation:o,conditions:candidates.slice(0,3),score:healthScore(o,previous),actions,treatments,nextQuestion:/yellow|पीले|पिवळ/.test(text)?questions.find(q=>!o.answers[q.id])?.text??'Ask an agronomist to review the roots and soil.':'Can you show the underside of an affected leaf?',source:'demo',expertReviewNeeded:true,reasonForEscalation:'This offline demonstration uses reported symptoms, not image recognition. Confirm the cause before treatment.',followUpAt:new Date(Date.now()+2*86400000).toISOString(),weather};
}
export function resistanceWarnings(records:ChemicalApplication[],sector:string):string[]{
 const recent=records.filter(r=>r.fieldSector===sector&&Date.now()-new Date(r.date).getTime()<=90*86400000&&new Date(r.date).getTime()<=Date.now());const out:string[]=[];
 for(const field of ['ingredient','group'] as const){const counts=new Map<string,number>();for(const r of recent){const key=r[field].trim().toLowerCase();if(key&&key!=='unknown')counts.set(key,(counts.get(key)||0)+1);}for(const [key,n]of counts)if(n>=2)out.push(`${field==='group'?'Mode-of-action group':'Active ingredient'} ${key} recorded ${n} times in this sector in 90 days. Review label limits and rotation with an agronomist; changing brand alone may not change the group.`);}
 return out;
}
export function outbreakRisk(diagnoses:Diagnosis[],weather?:WeatherSnapshot):OutbreakWarning{
 if(!weather||weather.source!=='live'||Date.now()-new Date(weather.date).getTime()>3*3600000)return{level:'Unknown',reasons:['A recent live forecast is needed.','No community reports connected.']};
 const wet=weather.hours.some(h=>h.humidity>80&&h.rain>40);const recent=diagnoses.filter(d=>d.source==='ai'&&Date.now()-new Date(d.observation.date).getTime()<7*86400000&&d.conditions.some(c=>c.type==='disease')).length;
 return {level:wet&&recent>=2?'High':wet||recent>0?'Medium':'Low',reasons:[wet?'Wet, humid conditions may favour some crop diseases.':'No broad wet-weather signal in the supplied forecast.',`${recent} recent AI disease reports on this device. No community data.`,`Heuristic watch signal, not an outbreak prediction model.`]};
}
export function outcomeSummary(outcomes:OutcomeFeedback[],id:string){return outcomes.filter(o=>o.diagnosisId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];}
