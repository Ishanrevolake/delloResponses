import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';
import {AppError,date} from './ai-validation';
import {londonDate} from './automation-model';

const headers={'Cache-Control':'no-store, private','Pragma':'no-cache','X-Content-Type-Options':'nosniff'};
const buckets=new Map<string,{start:number;count:number}>();
export function reserveClientRequest(key:string,now=Date.now()){
 let bucket=buckets.get(key);
 if(!bucket||now-bucket.start>=60000){bucket={start:now,count:0};buckets.set(key,bucket);}
 bucket.count++;
 if(bucket.count>120)throw new AppError('API rate limit reached. Retry in one minute.',429);
}
export function verifyClientToken(authorization:string|null,hash:string,expires:string,now=Date.now()){
 if(!/^[a-f0-9]{64}$/i.test(hash)||!Number.isFinite(Date.parse(expires)))throw new AppError('Client API is not configured.',503);
 const token=/^Bearer (graft_read_[a-f0-9]{64})$/i.exec(authorization||'')?.[1];
 if(!token||!timingSafeEqual(createHash('sha256').update(token).digest(),Buffer.from(hash,'hex'))||Date.parse(expires)<=now)throw new AppError('Invalid or expired API key.',401);
}
async function authenticate(req:Request){
 const hash=process.env.CLIENT_API_KEY_HASH||'',expires=process.env.CLIENT_API_KEY_EXPIRES_AT||'';
 verifyClientToken(req.headers.get('authorization'),hash,expires);
 reserveClientRequest(hash);
 const id=process.env.CLIENT_API_WEBSITE_ID,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!id||!url||!key)throw new AppError('Client API is not configured.',503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const site=await db.from('websites').select('id,name').eq('id',id).maybeSingle();
 if(site.error||!site.data||site.data.name.toLowerCase().replace(/[^a-z]/g,'')!=='graftgym')throw new AppError('Client API website configuration is unavailable.',503);
 return {db,websiteId:id};
}
type Context=Awaited<ReturnType<typeof authenticate>>;
function checkError(error:unknown){if(error)throw new AppError('Could not retrieve dashboard data. Please try again.',503);}
export function parseClientQuery(req:Request,paginated=true){
 const params=new URL(req.url).searchParams;
 const allowed=paginated?['page','limit','from','to']:['from','to'];
 for(const name of params.keys())if(!allowed.includes(name)||params.getAll(name).length!==1)throw new AppError(`Unsupported or repeated query parameter: ${name}.`);
 const number=(name:string,fallback:number,max:number)=>{const value=params.get(name);if(value===null)return fallback;if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>max)throw new AppError(`Invalid ${name}.`);return Number(value);};
 const page=number('page',1,10000),limit=number('limit',50,100);
 const from=params.has('from')?date(params.get('from'),'from date'):undefined;
 const to=params.has('to')?date(params.get('to'),'to date'):undefined;
 if(from&&to&&from>to)throw new AppError('from must be on or before to.');
 return {page,limit,from,to};
}
function failure(error:unknown){
 const status=error instanceof AppError?error.status:500,message=error instanceof AppError?error.message:'Could not complete the API request.';
 return NextResponse.json({error:message},{status,headers:{...headers,...(status===401?{'WWW-Authenticate':'Bearer realm="GraftGym read API"'}:{}),...(status===429?{'Retry-After':'60'}:{})}});
}
function text(value:unknown){return typeof value==='string'?value:null;}
export async function getClientSubmissions(req:Request){
 try{
  const {db,websiteId}=await authenticate(req);const q=parseClientQuery(req);
  let query=db.from('submissions').select('id,created_at,data',{count:'exact'}).eq('website_id',websiteId);
  if(q.from)query=query.gte('created_at',`${q.from}T00:00:00Z`);
  if(q.to)query=query.lte('created_at',`${q.to}T23:59:59.999Z`);
  const {data,error,count}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).range((q.page-1)*q.limit,q.page*q.limit-1);checkError(error);
  return NextResponse.json({data:(data||[]).map(row=>{const fields=row.data&&typeof row.data==='object'&&!Array.isArray(row.data)?row.data:{};return {id:row.id,submitted_at:row.created_at,name:text(fields.fullName)||text(fields.name),email:text(fields.email),message:text(fields.message),fields};}),pagination:{page:q.page,limit:q.limit,total:count||0,total_pages:Math.ceil((count||0)/q.limit)},meta:{website:'GraftGym',timezone:'UTC',generated_at:new Date().toISOString()}},{headers});
 }catch(error){return failure(error);}
}
export function membershipState(row:{status:string;membership_status:string;membership_end_date:string|null},today=londonDate()){
 if(row.status==='closed')return 'closed';
 if(row.membership_status!=='active')return row.membership_status;
 return row.membership_end_date&&row.membership_end_date<today?'expired':'active';
}
export async function getClientMemberships(req:Request){
 try{
  const {db,websiteId}=await authenticate(req);const q=parseClientQuery(req);
  let query=db.from('automation_clients').select('id,name,email,status,membership_end_date,membership_status,do_not_contact,created_at',{count:'exact'}).eq('website_id',websiteId).not('membership_end_date','is',null);
  if(q.from)query=query.gte('membership_end_date',q.from);
  if(q.to)query=query.lte('membership_end_date',q.to);
  const {data,error,count}=await query.order('membership_end_date',{ascending:false}).order('id',{ascending:false}).range((q.page-1)*q.limit,q.page*q.limit-1);checkError(error);
  return NextResponse.json({data:(data||[]).map(row=>({id:row.id,name:row.name,email:row.email,membership_end_date:row.membership_end_date,membership_status:row.membership_status,client_status:row.status,effective_status:membershipState(row),do_not_contact:row.do_not_contact})),pagination:{page:q.page,limit:q.limit,total:count||0,total_pages:Math.ceil((count||0)/q.limit)},meta:{website:'GraftGym',timezone:'Europe/London',source:'Explicit membership dates recorded in Automation; training profiles are not membership records.',generated_at:new Date().toISOString()}},{headers});
 }catch(error){return failure(error);}
}
async function analyticsRows(context:Context,from:string,to:string){
 const rows:{id:string;created_at:string}[]=[];
 for(let offset=0;offset<20000;offset+=1000){
  const result=await context.db.from('submissions').select('id,created_at').eq('website_id',context.websiteId).gte('created_at',`${from}T00:00:00Z`).lte('created_at',`${to}T23:59:59.999Z`).order('id').range(offset,offset+999);checkError(result.error);rows.push(...(result.data||[]));if(!result.data||result.data.length<1000)return rows;
 }
 throw new AppError('This analytics period is too large. Choose a smaller date range.',413);
}
export async function getClientAnalytics(req:Request){
 try{
  const context=await authenticate(req),q=parseClientQuery(req,false);const today=new Date().toISOString().slice(0,10);
  const from=q.from||new Date(Date.now()-6*86400000).toISOString().slice(0,10),to=q.to||today;
  if(from>to||to>today||Date.parse(to)-Date.parse(from)>=366*86400000)throw new AppError('Analytics supports an ordered range of at most 366 days, ending today or earlier.');
  const baseMembership=()=>context.db.from('automation_clients').select('id',{count:'exact',head:true}).eq('website_id',context.websiteId).not('membership_end_date','is',null);
  const [rows,total,recorded,expired,active,renewed,cancelled]=await Promise.all([
   analyticsRows(context,from,to),context.db.from('submissions').select('id',{count:'exact',head:true}).eq('website_id',context.websiteId),
   baseMembership(),baseMembership().eq('membership_status','active').neq('status','closed').lt('membership_end_date',londonDate()),
   baseMembership().eq('membership_status','active').neq('status','closed').gte('membership_end_date',londonDate()),
   baseMembership().eq('membership_status','renewed').neq('status','closed'),baseMembership().eq('membership_status','cancelled').neq('status','closed'),
  ]);
  for(const value of [total,recorded,expired,active,renewed,cancelled])checkError(value.error);
  const daily:Record<string,number>={};for(let time=Date.parse(from);time<=Date.parse(to);time+=86400000)daily[new Date(time).toISOString().slice(0,10)]=0;
  for(const row of rows)daily[row.created_at.slice(0,10)]=(daily[row.created_at.slice(0,10)]||0)+1;
  return NextResponse.json({data:{enquiries:{total_all_time:total.count||0,total_in_period:rows.length,daily:Object.entries(daily).map(([date,count])=>({date,count}))},memberships:{recorded:recorded.count||0,active:active.count||0,expired:expired.count||0,renewed:renewed.count||0,cancelled:cancelled.count||0}},meta:{website:'GraftGym',from,to,enquiry_timezone:'UTC',membership_timezone:'Europe/London',membership_counts:'Current snapshot; recorded includes closed records, other counts exclude closed records.',generated_at:new Date().toISOString()}},{headers});
 }catch(error){return failure(error);}
}
