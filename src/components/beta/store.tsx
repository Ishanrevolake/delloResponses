"use client";
import {createContext,useContext,useState,type ReactNode} from 'react';
import {makeMembers,makeLeads,makeJourneys,type DemoLead} from './data';
export interface PreviewTask {id:string;text:string;done:boolean}
function usePreviewModel(){
 const [members,setMembers]=useState(makeMembers),[leads,setLeads]=useState(makeLeads),[journeys,setJourneys]=useState(makeJourneys);
 const [tasks,setTasks]=useState<PreviewTask[]>([{id:'task-1',text:'Call Ella about her trial',done:false},{id:'task-2',text:'Check in with members who have gone quiet',done:false},{id:'task-3',text:'Review tomorrow’s class waiting lists',done:true}]);
 const [audit,setAudit]=useState([{id:'audit-1',time:'09:20',text:'Sample trial follow-up reviewed'},{id:'audit-2',time:'08:45',text:'Example member task completed'}]);
 const [notice,setNotice]=useState('');
 function log(text:string){setAudit(previous=>[{id:crypto.randomUUID(),time:'Just now',text},...previous].slice(0,100));}
 function notify(text:string){setNotice(text);}
 function addTask(text:string){if(!text.trim())return;setTasks(previous=>[{id:crypto.randomUUID(),text:text.trim(),done:false},...previous]);log('Added preview task: '+text);notify('Task added in this preview.');}
 function moveLead(id:string,stage:DemoLead['stage']){setLeads(previous=>previous.map(lead=>lead.id===id?{...lead,stage}:lead));log('Updated a sample enquiry to '+stage);}
 function reset(){setMembers(makeMembers());setLeads(makeLeads());setJourneys(makeJourneys());notify('Sample data reset for the Beta workspace.');}
 return {members,setMembers,leads,setLeads,journeys,setJourneys,tasks,setTasks,audit,notice,setNotice,log,notify,addTask,moveLead,reset};
}
type PreviewModel=ReturnType<typeof usePreviewModel>;
const Context=createContext<PreviewModel|null>(null);
export function BetaProvider({children}:{children:ReactNode}){const model=usePreviewModel();return <Context.Provider value={model}>{children}</Context.Provider>;}
export function useBeta(){const model=useContext(Context);if(!model)throw new Error('Beta components need a BetaProvider.');return model;}
