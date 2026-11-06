// Explicit live smoke test: creates only synthetic, isolated records; deletes them in finally.
// No SMTP calls. Run manually with npm run test:ai:live while the local app is running.
const {createClient}=require('@supabase/supabase-js');
const {createServerClient}=require('@supabase/ssr');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
process.loadEnvFile('.env.local');
const base=process.env.AUTOMATION_BASE_URL||'http://127.0.0.1:3000';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const today=new Date().toISOString().slice(0,10),days=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
let userId,websiteId,cookieHeader='';
async function insert(table,record){const {data,error}=await db.from(table).insert(record).select('id').single();if(error)throw new Error(`Could not seed ${table} (${error.code})`);return data.id;}
async function call(path,body){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookieHeader},body:JSON.stringify(body),signal:AbortSignal.timeout(115000)});const data=await response.json();if(!response.ok)throw new Error(`${path}: ${response.status} ${data.error||'Request failed'}`);return data;}
(async()=>{
 try{
  const label=randomUUID(),email=`ai-smoke-${label}@example.invalid`,password=randomUUID()+randomUUID();
  const created=await db.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw new Error('Could not create isolated test account.');userId=created.data.user.id;
  const role=await db.from('user_roles').insert({user_id:userId,role:'owner'});if(role.error)throw new Error('Could not create test account role.');
  websiteId=await insert('websites',{owner_id:userId,name:'GraftGym',domain:`ai-smoke-${label}.example.invalid`});
  const setting=await db.from('ai_business_settings').insert({owner_id:userId,website_id:websiteId,business_name:'GraftGym synthetic test',services:'General fitness classes and personal training. Test data only.',prices:'',opening_hours:'',tone:'Friendly and professional',ai_enabled:true,approved_exercises:['walk','wall_pushup']});if(setting.error)throw new Error('Could not save synthetic AI settings.');
  const submissionId=await insert('submissions',{website_id:websiteId,created_at:new Date(Date.now()-5*86400000).toISOString(),data:{name:'Synthetic Enquiry',email:'synthetic@example.invalid',message:'I am interested in evening personal training sessions. What are the next steps?'}});
  const memberId=await insert('fitness_members',{owner_id:userId,website_id:websiteId,name:'Synthetic Training Member',goal:'Build a consistent general fitness routine.',experience:'beginner',equipment:'wall, comfortable walking space',days_per_week:2,session_minutes:20,ai_consent:true,trainer_clearance:true});
  const logs=await db.from('fitness_workout_logs').insert([{owner_id:userId,member_id:memberId,performed_on:today,exercise:'Walking',minutes:20,sets:1,reps:1,weight_kg:null,notes:'Synthetic test entry.'},{owner_id:userId,member_id:memberId,performed_on:today,exercise:'Wall push-up',minutes:10,sets:2,reps:8,weight_kg:null,notes:'Synthetic test entry.'}]);if(logs.error)throw new Error('Could not seed workout logs.');
  const auto=await db.from('automation_settings').insert({website_id:websiteId,enabled:false,weekly_enabled:false});if(auto.error)throw new Error('Could not seed disabled automation settings.');
  await insert('automation_clients',{website_id:websiteId,source_submission_id:submissionId,name:'Synthetic Membership Client',email:'synthetic@example.invalid',enquiry_at:new Date(Date.now()-5*86400000).toISOString(),membership_end_date:days(-1),membership_status:'active',status:'converted'});
  const cookies=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>Array.from(cookies,([name,value])=>({name,value})),setAll:values=>values.forEach(v=>cookies.set(v.name,v.value))}});
  const signed=await auth.auth.signInWithPassword({email,password});if(signed.error)throw new Error('Could not sign in isolated test account.');cookieHeader=Array.from(cookies,([name,value])=>`${name}=${value}`).join('; ');
  const metadataResponse=await fetch(`${base}/api/fitness?websiteId=${websiteId}`,{headers:{Cookie:cookieHeader},signal:AbortSignal.timeout(30000)});const metadata=await metadataResponse.json();assert.equal(metadataResponse.status,200);assert.equal(metadata.configured,true);assert.equal(metadata.providerLabel,'Google Gemini');console.log('PASS provider configuration: Google Gemini / '+metadata.model);
  const allActions=['summary','reply','insights','ask','progress','workout'];const filter=process.argv.find(arg=>arg.startsWith('--actions='))?.split('=')[1]?.split(',');const actions=filter?allActions.filter(action=>filter.includes(action)):allActions;const includeChat=!filter||filter.includes('chat');let failures=0;
  for(let i=0;i<actions.length;i++){
   if(i)await new Promise(resolve=>setTimeout(resolve,16000));
   const action=actions[i];
   try{
    const data=await call('/api/ai',{action,websiteId,submissionId,memberId,start:days(-7),end:today,question:'How many enquiries arrived in the selected date range?'});
    assert.ok(data.result.title);assert.ok(data.result.summary);assert.equal(data.model,process.env.GEMINI_MODEL);
    if(action==='reply')assert.ok(data.result.body&&data.result.subject);
    if(action==='insights')assert.equal(data.evidence.current.total,1);
    if(action==='ask')assert.equal(data.evidence.total,1);
    if(action==='progress'){assert.equal(data.evidence.metrics.trainingDays,1);assert.equal(data.result.workouts.length,0);assert.equal(data.result.body,'');}
    if(action==='workout'){assert.ok(data.result.workouts.length);assert.ok(data.result.workouts.every(w=>['walk','wall_pushup'].includes(w.exercise_id)&&w.day<=2));}
    console.log('PASS '+action);
   }catch(error){failures++;console.log('FAIL '+action+': '+error.message);}
  }
  if(includeChat){
  if(actions.length)await new Promise(resolve=>setTimeout(resolve,16000));
  try{const chat=await call('/api/automation/chat',{websiteId,question:'Who has an expired membership in the last seven days?',history:[]});assert.ok(chat.answer);assert.equal(chat.evidence.matchingClients,1);console.log('PASS dashboard chatbot: verified one matching synthetic membership.');}catch(error){failures++;console.log('FAIL chatbot: '+error.message);}
  }
  const total=actions.length+(includeChat?1:0);console.log(`Live workflow checks: ${total-failures}/${total} passed.`);if(failures)process.exitCode=1;
 }catch(error){console.log('Live test setup failed: '+error.message);process.exitCode=1;}
 finally{
  let clean=true;
  if(websiteId){const result=await db.from('websites').delete().eq('id',websiteId).eq('owner_id',userId);if(result.error)clean=false;}
  if(userId){const result=await db.auth.admin.deleteUser(userId);if(result.error)clean=false;}
  console.log(clean?'Synthetic records and test account removed.':'Synthetic cleanup needs review.');if(!clean)process.exitCode=1;
 }
})().catch(()=>{console.log('Live test could not complete.');process.exitCode=1;});
