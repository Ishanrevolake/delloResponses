const { test, after } = require('node:test');
const originalKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
after(() => { if(originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
// Run the real TypeScript modules using the installed compiler; no test-only dependencies.
function loader(mocks = {}) {
 const cache = new Map();
 function load(file) {
  file = path.resolve(ROOT,file);
  if(cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}};cache.set(file,module);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const run=vm.runInThisContext(`(function(require,module,exports){${source}\n})`,{filename:file});
  run(name=>{
   if(Object.hasOwn(mocks,name))return mocks[name];
   if(name==='server-only')return {};
   if(name==='next/server')return {NextResponse:{json:(body,options)=>Response.json(body,options)}};
   if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
   if(name.startsWith('.'))return load(path.resolve(path.dirname(file),`${name}.ts`));
   return require(name);
  },module,module.exports);
  return module.exports;
 }
 return load;
}
const load=loader();
const metrics=load('src/lib/ai-metrics.ts');
const validation=load('src/lib/ai-validation.ts');
const SITE='11111111-1111-4111-8111-111111111111', SUB='22222222-2222-4222-8222-222222222222', MEMBER='33333333-3333-4333-8333-333333333333';
const result={title:'Enquiry summary',summary:'Interested in training.',category:'personal_training',highlights:[],next_steps:[],subject:'',body:'',workouts:[]};
const today=new Date().toISOString().slice(0,10);
function fixture(options={}) {
 const calls=[],writes=[];
 const tables={
  websites:[{id:SITE,name:'GraftGym',owner_id:options.otherOwner?'other':'user'}],
  user_roles:options.admin?[{user_id:'user',role:'admin'}]:[],
  ai_business_settings:[{owner_id:'user',website_id:SITE,ai_enabled:options.enabled!==false,business_name:'GraftGym',services:'Personal training',prices:'',opening_hours:'',tone:'Friendly',approved_exercises:['walk']}],
  submissions:[{id:SUB,website_id:SITE,created_at:`${today}T12:00:00Z`,data:{message:'Interested in personal training',email:'member@example.com',name:'Private Name'}}],
  fitness_members:[{id:MEMBER,owner_id:'user',website_id:SITE,name:'Private Name',goal:'Consistency',equipment:'none',experience:'beginner',days_per_week:3,session_minutes:30,ai_consent:options.consent!==false,trainer_clearance:options.clearance!==false}],
  fitness_workout_logs:options.noLogs?[]:[{owner_id:'user',member_id:MEMBER,performed_on:today,exercise:'Walking',minutes:30,sets:1,reps:1,weight_kg:null,notes:''}],
  ai_results:options.cached?[{owner_id:'user',result,created_at:new Date().toISOString(),model:'test-model',evidence:{submissionId:SUB}}]:[],
 };
 const db={auth:{getUser:async()=>({data:{user:options.signedOut?null:{id:'user'}}})},rpc:async()=>{calls.push('reserve');return {data:options.limited?false:true,error:null};},from(table){
  const filters=[];let mutation=null;
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},gte(){return q;},lte(){return q;},order(){return q;},limit(){return q;},range(){return Promise.resolve(resolve(false));},
   upsert(value){mutation=value;writes.push({table,value});return q;},insert(value){mutation=value;writes.push({table,value});return q;},delete(){mutation={};return q;},update(value){mutation=value;writes.push({table,value});return q;},
   maybeSingle:async()=>resolve(true),single:async()=>resolve(true),then(onFulfilled,onRejected){return Promise.resolve(resolve(false)).then(onFulfilled,onRejected);}};
  function resolve(single){
   if(options.missingSchema&&table==='ai_business_settings')return {data:null,error:{code:'PGRST205'}};
   const data=(tables[table]||[]).filter(row=>filters.every(([k,v])=>k==='cache_key'?true:row[k]===v));
   return {data:mutation||(single?(data[0]||null):data),error:null,count:data.length};
  }
  return q;
 }};
 const mockAI={modelName:()=> 'test-model',PROMPT_VERSION:'test-v1',generateResult:async(instructions,context)=>{calls.push({instructions,context});return options.badWorkout?{...result,workouts:[{day:1,exercise_id:'band_row',sets:2,reps:'10',notes:''}]}:result;},generateJSON:async()=>options.plan||{start:today,end:today,search:'',groupBy:'day',supported:true}};
 const local=loader({'@/utils/supabase/server':{createClient:async()=>db},'@/lib/ai':mockAI,'nodemailer':{createTransport:()=>{calls.push('smtp');return {sendMail:async()=>({messageId:'test'})};}}});
 return {email:local('src/app/api/send-email/route.ts'),route:local('src/app/api/ai/route.ts'),fitness:local('src/app/api/fitness/route.ts'),server:local('src/lib/ai-server.ts'),calls,writes,db};
}
async function request(f,body){return f.route.POST(new Request('http://localhost/api/ai',{method:'POST',body:JSON.stringify({websiteId:SITE,submissionId:SUB,memberId:MEMBER,...body})}));}

test('date counts include the end of the day and exclude other dates',()=>{
 const rows=[{id:'a',created_at:'2026-10-31T23:59:59.999Z',data:{message:'Trial'}},{id:'b',created_at:'2026-11-01T00:00:00Z',data:{message:'Trial'}}];
 assert.equal(metrics.aggregate(rows,'2026-10-31','2026-10-31').total,1);
});
test('exact phrase filtering and keyword categories are explicit',()=>{
 const rows=[{id:'a',created_at:'2026-11-01T10:00:00Z',data:{message:'PERSONAL TRAINING please'}},{id:'b',created_at:'2026-11-01T11:00:00Z',data:{message:'Trial session'}}];
 const m=metrics.aggregate(rows,'2026-11-01','2026-11-01','personal training','category');assert.equal(m.total,1);assert.equal(m.groups.personal_training,1);
});
test('reversed and overly broad intervals are rejected',()=>{
 assert.throws(()=>metrics.aggregate([],'2026-11-02','2026-11-01'));assert.throws(()=>metrics.aggregate([],'2024-01-01','2026-11-01'));
});
test('progress counts unique training days rather than exercise rows',()=>{
 const m=metrics.progressMetrics([{performed_on:'2026-11-01',minutes:20},{performed_on:'2026-11-01',minutes:10},{performed_on:'2026-09-01',minutes:40}],3,'2026-11-01');
 assert.equal(m.trainingDays,1);assert.equal(m.minutes,30);assert.equal(m.targetTrainingDays,12);assert.equal(m.adherencePercent,8);
});
test('contact masking and allowlisted enquiry fields omit unrelated data',()=>{
 assert.equal(metrics.messageOf({data:{message:'Email test@example.com or +94 77 123 4567',secret:'private'}}),'Email [email] or [phone]');
 assert.equal(metrics.messageOf({data:{fullName:'Private',email:'private@example.com'}}),'');
});
test('validation rejects impossible dates, invalid IDs and malformed AI results',()=>{
 assert.throws(()=>validation.date('2026-02-30','date'));assert.throws(()=>validation.uuid('bad'));assert.throws(()=>validation.validateResult({...result,highlights:[1]}));assert.throws(()=>validation.validateResult({...result,workouts:[{day:7,sets:1,exercise_id:'walk',reps:'10',notes:''}]}));assert.deepEqual(validation.validateResult(result),result);
});
test('unauthenticated AI requests stop before provider calls',async()=>{const f=fixture({signedOut:true});assert.equal((await request(f,{action:'summary'})).status,401);assert.equal(f.calls.length,0);});
test('another website owner is denied even if database RLS is permissive',async()=>{const f=fixture({otherOwner:true});assert.equal((await request(f,{action:'summary'})).status,403);assert.equal(f.calls.length,0);});
test('admin access follows the existing dashboard role model',async()=>{const f=fixture({otherOwner:true,admin:true});assert.equal((await request(f,{action:'summary'})).status,200);});
test('disabled data sharing blocks generation',async()=>{const f=fixture({enabled:false});assert.equal((await request(f,{action:'summary'})).status,403);assert.equal(f.calls.length,0);});
test('missing migration produces an actionable setup error',async()=>{const response=await request(fixture({missingSchema:true}),{action:'summary'});assert.equal(response.status,503);assert.match((await response.json()).error,/database setup/);});
test('rate limited requests do not invoke the provider',async()=>{const f=fixture({limited:true});assert.equal((await request(f,{action:'summary'})).status,429);assert.deepEqual(f.calls,['reserve']);});
test('cached results are returned without consuming usage',async()=>{const f=fixture({cached:true});const response=await request(f,{action:'summary'});assert.equal(response.status,200);assert.equal((await response.json()).cached,true);assert.equal(f.calls.length,0);});
test('generation saves results and does not send member name or email',async()=>{const f=fixture();assert.equal((await request(f,{action:'summary'})).status,200);const context=f.calls.find(c=>typeof c==='object').context;assert.doesNotMatch(JSON.stringify(context),/Private Name|member@example.com/);assert.equal(f.writes[0].table,'ai_results');});
test('a submission from another website is not found',async()=>{const f=fixture();assert.equal((await request(f,{action:'summary',submissionId:MEMBER})).status,404);assert.equal(f.calls.length,0);});
test('member permission and trainer clearance are enforced server-side',async()=>{assert.equal((await request(fixture({consent:false}),{action:'progress'})).status,403);assert.equal((await request(fixture({clearance:false}),{action:'workout'})).status,403);});
test('progress requires recorded workout data',async()=>{assert.equal((await request(fixture({noLogs:true}),{action:'progress'})).status,400);});
test('unapproved exercise output is rejected before saving',async()=>{const f=fixture({badWorkout:true});assert.equal((await request(f,{action:'workout'})).status,502);assert.equal(f.writes.length,0);});
test('dashboard questions execute only a validated plan and computed totals',async()=>{const f=fixture();const response=await request(f,{action:'ask',question:'How many enquiries?',start:today,end:today});assert.equal(response.status,200);const data=await response.json();assert.equal(data.evidence.total,1);const context=f.calls.find(c=>typeof c==='object').context;assert.equal(context.metrics.total,1);assert.equal(context.source,undefined);});
test('AI query dates cannot escape the selected window',async()=>{const f=fixture({plan:{start:'2020-01-01',end:today,search:'',groupBy:'day',supported:true}});assert.equal((await request(f,{action:'ask',question:'All enquiries',start:today,end:today})).status,400);assert.equal(f.writes.length,0);});
test('invalid input does not reach generation',async()=>{const f=fixture();assert.equal((await request(f,{action:'delete-database'})).status,400);const response=await f.route.POST(new Request('http://localhost/api/ai',{method:'POST',body:'not json'}));assert.equal(response.status,400);assert.equal(f.calls.length,0);});
test('fitness API requires authentication and website ownership',async()=>{
 const signedOut=fixture({signedOut:true});assert.equal((await signedOut.fitness.GET(new Request(`http://localhost/api/fitness?websiteId=${SITE}`))).status,401);
 const other=fixture({otherOwner:true});assert.equal((await other.fitness.GET(new Request(`http://localhost/api/fitness?websiteId=${SITE}`))).status,403);
});
test('fitness logs reject invalid numbers and impossible dates',async()=>{
 const f=fixture();const response=await f.fitness.POST(new Request('http://localhost/api/fitness',{method:'POST',body:JSON.stringify({websiteId:SITE,operation:'log',memberId:MEMBER,log:{performed_on:'2026-02-30',exercise:'Walking',minutes:30,sets:1,reps:1,weight_kg:null,notes:''}})}));assert.equal(response.status,400);assert.equal(f.writes.length,0);
});


test('OpenAI adapter sends strict JSON schema with provider storage disabled',async()=>{
 const originalFetch=global.fetch;let payload;
 try {
  global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]});};
  const ai=loader()('src/lib/ai.ts');assert.deepEqual(await ai.generateResult('Summarize.',{enquiry:'Test'}),result);
  assert.equal(payload.store,false);assert.equal(payload.text.format.type,'json_schema');assert.equal(payload.text.format.strict,true);assert.match(payload.instructions,/untrusted data/);
 }finally{global.fetch=originalFetch;}
});
test('OpenAI adapter handles refusal, truncation, quota errors and malformed JSON',async()=>{
 const originalFetch=global.fetch;const ai=loader()('src/lib/ai.ts');
 try {
  global.fetch=async()=>Response.json({status:'incomplete',output:[]});await assert.rejects(ai.generateResult('Test',{}),/incomplete/);
  global.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'refusal',refusal:'Cannot comply'}]}]});await assert.rejects(ai.generateResult('Test',{}),/valid response/);
  global.fetch=async()=>Response.json({error:{}},{status:429});await assert.rejects(ai.generateResult('Test',{}),/usage limit/);
  global.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:'not json'}]}]});await assert.rejects(ai.generateResult('Test',{}),/valid response/);
 }finally{global.fetch=originalFetch;}
});
test('OpenAI adapter reports a missing key without network access',async()=>{
 const originalKey=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try { await assert.rejects(loader()('src/lib/ai.ts').generateResult('Test',{}),/not configured/); }finally{process.env.OPENAI_API_KEY=originalKey;}
});


test('email endpoint blocks unauthenticated, cross-owner, and mismatched recipient sends',async()=>{
 for(const options of [{signedOut:true},{otherOwner:true},{}]){
  const f=fixture(options);const form=new FormData();form.set('submissionId',SUB);form.set('to','wrong@example.com');form.set('subject','Draft');form.set('message','Reviewed body');
  const response=await f.email.POST(new Request('http://localhost/api/send-email',{method:'POST',body:form}));
  assert.equal(response.status,options.signedOut?401:options.otherOwner?403:400);assert.ok(!f.calls.includes('smtp'));
 }
});
