export type Language = 'en'|'hi'|'mr';
export type Page = 'home'|'diagnose'|'history'|'weather'|'treatments'|'settings'|'result';
export interface FarmerPreferences { language:Language; location:string; latitude:number; longitude:number; weatherMode:'demo'|'live'; }
export interface Field { id:string; name:string; }
export interface FieldSector { id:string; fieldId:string; name:string; }
export interface MediaRecord { dataUrl:string; quality:'good'|'weak'; issues:string[]; }
export interface CropObservation { id:string; date:string; crop:string; growthStage:string; fieldSector:string; symptoms:string[]; farmerDescription:string; affected:number; severity:number; soilType:string; drainage:string; moisture:string; language:Language; image?:MediaRecord; voiceNote?:string; answers:Record<string,string>; }
export interface PossibleCondition { name:string; type:'disease'|'pest'|'nutrient'|'water'|'weather'|'unknown'; confidence:number; evidence:string[]; severity:'low'|'medium'|'high'; }
export interface FollowUpQuestion { id:string; text:string; }
export interface PlantHealthScore { value:number; range:[number,number]; band:string; confidence:string; reasons:string[]; trend:string; }
export interface TreatmentRecommendation { title:string; purpose:string; priority:string; expected:string; precautions:string; reassess:string; expert:boolean; }
export interface Diagnosis { id:string; observation:CropObservation; conditions:PossibleCondition[]; score:PlantHealthScore; actions:string[]; treatments:TreatmentRecommendation[]; nextQuestion:string; source:'demo'|'ai'; expertReviewNeeded:boolean; reasonForEscalation:string; followUpAt:string; weather?:WeatherSnapshot; fingerprint?:string; }
export interface ChemicalApplication { id:string; fieldSector:string; product:string; ingredient:string; group:string; date:string; target:string; result:string; feedback:string; }
export interface OutcomeFeedback { id:string; diagnosisId:string; date:string; outcome:'improved'|'same'|'worse'; action:string; sideEffects:string; }
export interface WeatherHour { time:string; temperature:number; humidity:number; wind:number; rain:number; }
export interface WeatherSnapshot { date:string; source:'demo'|'live'; latitude:number; longitude:number; location:string; hours:WeatherHour[]; }
export interface SprayWindow { hour:WeatherHour; suitable:boolean; reasons:string[]; }
export interface OutbreakWarning { level:'Low'|'Medium'|'High'|'Unknown'; reasons:string[]; }
export interface PendingRequest { id:string; observation:CropObservation; date:string; }
export interface AppData { preferences:FarmerPreferences; fields:Field[]; sectors:FieldSector[]; diagnoses:Diagnosis[]; chemicals:ChemicalApplication[]; outcomes:OutcomeFeedback[]; queue:PendingRequest[]; weather?:WeatherSnapshot; }
