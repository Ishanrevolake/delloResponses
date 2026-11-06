import {pathToFileURL} from 'node:url';
const resources=new Set(['submissions','memberships','analytics']);
export async function getResource(resource,query={}){
 if(!resources.has(resource))throw new Error('Unknown GraftGym resource.');
 const base=process.env.GRAFTGYM_API_BASE_URL?.replace(/\/$/,'');
 const key=process.env.GRAFTGYM_API_KEY;
 if(!base||!key)throw new Error('Configure the private GRAFTGYM_API_BASE_URL and GRAFTGYM_API_KEY variables.');
 const url=new URL(base+'/'+resource);
 for(const [name,value]of Object.entries(query))if(value!==undefined&&value!==null)url.searchParams.set(name,String(value));
 const response=await fetch(url,{headers:{Authorization:'Bearer '+key,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok){const error=new Error(`GraftGym ${resource} request failed: HTTP ${response.status}. ${response.status===404?'Confirm production activation and the API base URL.':''}`);error.status=response.status;error.retryAfter=response.headers.get('retry-after');throw error;}
 let body;try{body=await response.json();}catch{throw new Error('Expected JSON from the GraftGym API. Check the API base URL.');}
 if(!body||!Object.hasOwn(body,'data'))throw new Error('Unexpected API response shape.');
 return body;
}
export async function getAllPages(resource,query={}){
 if(resource==='analytics')throw new Error('Analytics is not a paginated list; use getResource.');
 const records=new Map();let page=1;
 while(true){
  const body=await getResource(resource,{...query,page,limit:100});
  if(!Array.isArray(body.data)||!body.pagination||!Number.isInteger(body.pagination.total_pages))throw new Error('Expected a paginated API response.');
  for(const row of body.data)records.set(row.id,row);
  if(page>=body.pagination.total_pages)break;
  if(page>=10000)throw new Error('Pagination limit reached. Use a smaller date range.');
  page++;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 return Array.from(records.values());
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{
  const enquiries=await getResource('submissions',{page:1,limit:10});
  const memberships=await getResource('memberships',{page:1,limit:10});
  const analytics=await getResource('analytics');
  console.log('Enquiries endpoint: connected; matching records:',enquiries.pagination.total);
  console.log('Memberships endpoint: connected; matching records:',memberships.pagination.total);
  console.log('Analytics endpoint: connected; enquiries in default period:',analytics.data.enquiries.total_in_period);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
