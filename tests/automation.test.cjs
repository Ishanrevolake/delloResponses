const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
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
const model=load('src/lib/automation-model.ts');
const server=load('src/lib/automation-server.ts');
const site='11111111-1111-4111-8111-111111111111';
const settings={...model.defaultAutomationSettings(site),enabled:true,enabled_at:'2026-01-01T00:00:00Z'};
const client={id:'22222222-2222-4222-8222-222222222222',website_id:site,source_submission_id:null,name:'Example Client',email:'client@example.com',enquiry_at:'2026-11-01T10:00:00Z',status:'open',do_not_contact:false,enquiry_followup_done:false,membership_end_date:null,membership_status:'active'};
const now=new Date('2026-11-06T09:00:00Z');
const delivery={id:'d',website_id:site,client_id:client.id,kind:'enquiry',dedupe_key:'key',recipient:client.email,subject:'Test',body:'Test',status:'sent',created_at:'2026-11-05T12:00:00Z',sent_at:'2026-11-05T12:00:00Z',error:null};
test('Friday owner report uses 09:00 GMT in winter',()=>{assert.equal(model.weeklyWindow(new Date('2026-11-06T08:59:59Z')),null);assert.equal(model.weeklyWindow(now).end,'2026-11-06T09:00:00.000Z');});
test('Friday owner report uses 08:00 UTC during British Summer Time',()=>{assert.equal(model.weeklyWindow(new Date('2026-07-03T07:59:59Z')),null);assert.equal(model.weeklyWindow(new Date('2026-07-03T08:00:00Z')).end,'2026-07-03T08:00:00.000Z');});
test('report periods account for daylight saving changes',()=>{
 const spring=model.weeklyWindow(new Date('2026-04-03T08:00:00Z'));
 const autumn=model.weeklyWindow(new Date('2026-10-30T09:00:00Z'));
 assert.equal((Date.parse(spring.end)-Date.parse(spring.start))/3600000,167);
 assert.equal((Date.parse(autumn.end)-Date.parse(autumn.start))/3600000,169);
});
test('weekly scheduling has a Friday catch-up window and one stable event key',()=>{assert.equal(model.weeklyWindow(new Date('2026-11-07T09:00:00Z')),null);assert.equal(model.weeklyWindow(new Date('2026-11-06T19:00:00Z')).key,model.weeklyWindow(now).key);});
test('enquiries become eligible after exactly four full days',()=>{assert.equal(model.eligible(client,'enquiry',settings,new Date('2026-11-05T09:59:59Z')),false);assert.equal(model.eligible(client,'enquiry',settings,new Date('2026-11-05T10:00:00Z')),true);});
test('membership remains valid until the next UK midnight',()=>{
 const member={...client,membership_end_date:'2026-07-02'};
 assert.equal(model.dueFor(member,'membership',settings),'2026-07-02T23:00:00.000Z');
 assert.equal(model.eligible(member,'membership',settings,new Date('2026-07-02T22:59:59Z')),false);
 assert.equal(model.eligible(member,'membership',settings,new Date('2026-07-02T23:00:00Z')),true);
});
test('converted members remain eligible for a membership reminder but not an enquiry email',()=>{const member={...client,status:'converted',membership_end_date:'2026-11-01'};assert.equal(model.eligible(member,'membership',settings,now),true);assert.equal(model.eligible(member,'enquiry',settings,now),false);});
test('contact suppression, renewals, closure, and existing manual follow-ups are respected',()=>{
 for(const changes of [{do_not_contact:true},{status:'closed'},{enquiry_followup_done:true},{status:'converted'}])assert.equal(model.eligible({...client,...changes},'enquiry',settings,now),false);
 for(const status of ['renewed','cancelled'])assert.equal(model.eligible({...client,membership_end_date:'2026-11-01',membership_status:status},'membership',settings,now),false);
});
test('historical expiries are excluded after activation',()=>{assert.equal(model.eligible(client,'enquiry',{...settings,enabled_at:'2026-11-06T00:00:00Z'},now),false);assert.equal(model.eligible(client,'enquiry',{...settings,enabled:false},now),false);});
test('timestamp formats do not change eligibility at an exact boundary',()=>{assert.equal(model.eligible(client,'enquiry',{...settings,enabled_at:'2026-11-05T10:00:00+00:00'},now),true);});
test('recipient validation rejects header injection and invalid addresses',()=>{assert.equal(model.emailAddress('person@example.com'),true);for(const value of ['a@b.com\r\nBcc: c@d.com','bad',null,'a <b@c.com>','one,two@example.com','one;two@example.com'])assert.equal(model.emailAddress(value),false);});
test('duplicate recipient records are merged for a run; membership reminder takes priority',()=>{const choices=server.candidates([client,{...client,id:'other',membership_end_date:'2026-11-01'}],settings,now);assert.equal(choices.length,1);assert.equal(choices[0].kind,'membership');});
test('a do-not-contact record blocks duplicate records for the same email',()=>{assert.equal(server.candidates([client,{...client,id:'other',do_not_contact:true}],settings,now).length,0);});
test('a current active membership suppresses obsolete duplicate expiry records',()=>{assert.equal(server.candidates([client,{...client,id:'new',membership_end_date:'2026-12-01'}],settings,now).length,0);});
test('recent follow-ups and uncertain outcomes block repeat sends across duplicate records',()=>{for(const status of ['sent','unknown','pending','sending','failed'])assert.equal(server.pendingCandidates([client],[{...delivery,status}],settings,now).length,0);assert.equal(server.pendingCandidates([client],[{...delivery,status:'cancelled'}],settings,now).length,1);});
test('dedupe keys distinguish a genuinely new membership cycle',()=>{assert.notEqual(model.eventKey({...client,membership_end_date:'2026-11-01'},'membership',settings),model.eventKey({...client,membership_end_date:'2026-12-01'},'membership',settings));});
test('weekly metrics exclude the next report boundary and use delivery outcomes',()=>{
 const metrics=model.weeklyMetrics([client,{...client,id:'boundary',enquiry_at:'2026-11-06T09:00:00Z'}],[delivery,{...delivery,id:'uncertain',status:'unknown'}],'2026-10-30T09:00:00Z','2026-11-06T09:00:00Z',settings);
 assert.equal(metrics.newEnquiries,1);assert.equal(metrics.sent,1);assert.equal(metrics.failed,1);assert.equal(metrics.uncertain,1);
});
test('email templates use recorded dates and configured GraftGym contact details',()=>{const email=model.clientEmail({...client,membership_end_date:'2026-11-01'},'membership');assert.match(email.body,/2026-11-01/);assert.match(email.body,/info@graftgymncl.co.uk/);assert.match(email.body,/stop/);assert.equal(model.defaultAutomationSettings(site).owner_email,'liamruth96@hotmail.co.uk');});

function fakeDB({enabled=true,sendResult='sent',changed=false,sourceChanged=false,otherOwner=false,signedOut=false,limited=false}={}){
 const actual=new Date(),enquiry=new Date(actual.getTime()-5*86400000).toISOString();
 const s={...settings,enabled,weekly_enabled:false,enabled_at:new Date(actual.getTime()-10*86400000).toISOString()};
 const c={...client,enquiry_at:enquiry,...(sourceChanged?{source_submission_id:'source'}:{})};
 const state={settings:s,clients:[c],deliveries:[],sends:[],claims:0};
 const db={auth:{getUser:async()=>({data:{user:signedOut?null:{id:'user'}},error:null})},from(table){let operation='read',value,filters=[],limit=1000,from=0,to=999;
  const q={select(){return q;},eq(k,v){filters.push([k,v,'eq']);return q;},lt(k,v){filters.push([k,v,'lt']);return q;},in(k,v){filters.push([k,v,'in']);return q;},order(){return q;},range(a,b){from=a;to=b;return Promise.resolve(resolve(false));},limit(n){limit=n;return q;},upsert(v){operation='insert';value=v;return q;},update(v){operation='update';value=v;return q;},single:async()=>resolve(true),maybeSingle:async()=>resolve(true),then(a,b){return Promise.resolve(resolve(false)).then(a,b);}};
  function resolve(single){
   let rows=table==='websites'?[{id:site,name:'GraftGym',owner_id:otherOwner?'other':'user'}]:table==='ai_business_settings'?[{owner_id:'user',website_id:site,ai_enabled:true}]:table==='automation_settings'?[state.settings]:table==='automation_clients'?state.clients:table==='automation_deliveries'?state.deliveries:table==='submissions'&&sourceChanged?[{id:'source',website_id:site,data:{email:'changed@example.com'}}]:[];
   rows=rows.filter(r=>filters.every(([k,v,op])=>op==='eq'?r[k]===v:op==='lt'?r[k]&&r[k]<v:v.includes(r[k])));
   if(operation==='insert'&&table==='automation_deliveries'){
    for(const record of Array.isArray(value)?value:[value]){if(!state.deliveries.some(d=>d.dedupe_key===record.dedupe_key))state.deliveries.push({id:'queued-'+state.deliveries.length,status:'pending',created_at:actual.toISOString(),sent_at:null,...record});}
   }else if(operation==='update')rows.forEach(r=>Object.assign(r,value));
   return {data:single?(rows[0]||null):rows.slice(from,Math.min(to+1,limit)),error:null};
  }
  return q;
 },rpc:async(name)=>{if(name==='reserve_ai_request')return {data:!limited,error:null};state.claims++;const next=state.deliveries.find(d=>d.status==='pending');if(!next)return {data:[],error:null};next.status='sending';next.claimed_at=actual.toISOString();if(changed)state.clients[0].do_not_contact=true;return {data:[{...next}],error:null};}};
 const mockMailer={createTransport:()=>({close(){},async sendMail(message){state.sends.push(message);if(sendResult==='timeout')throw Object.assign(new Error('Timeout'),{code:'ETIMEDOUT'});if(sendResult==='reject')throw Object.assign(new Error('Auth rejected'),{code:'EAUTH'});return {messageId:'test',accepted:[message.to]};}})};
 const run=loader({'nodemailer':mockMailer})('src/lib/automation-server.ts').runAutomation;
 return {state,db,run,now:actual};
}
async function withSending(fn){const names=['AUTOMATION_SEND_ENABLED','SMTP_HOST','SMTP_USER','SMTP_PASS'];const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));Object.assign(process.env,{AUTOMATION_SEND_ENABLED:'true',SMTP_HOST:'example.test',SMTP_USER:'test',SMTP_PASS:'test'});try{await fn();}finally{for(const k of names)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
test('worker claims, sends from the correct mailbox, and marks SMTP acceptance',()=>withSending(async()=>{const f=fakeDB();await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.sends.length,1);assert.equal(f.state.deliveries[0].status,'sent');assert.match(f.state.sends[0].from,/info@graftgymncl.co.uk/);await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.sends.length,1);}));
test('worker preview mode never queues, claims or sends a message',async()=>{const previous=process.env.AUTOMATION_SEND_ENABLED;delete process.env.AUTOMATION_SEND_ENABLED;try{const f=fakeDB();await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.sends.length,0);assert.equal(f.state.deliveries.length,0);assert.equal(f.state.claims,0);}finally{if(previous!==undefined)process.env.AUTOMATION_SEND_ENABLED=previous;}});
test('worker rechecks opt-out after claiming and cancels before SMTP',()=>withSending(async()=>{const f=fakeDB({changed:true});await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.sends.length,0);assert.equal(f.state.deliveries[0].status,'cancelled');}));
test('worker rejects a source submission whose email address changed',()=>withSending(async()=>{const f=fakeDB({sourceChanged:true});await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.sends.length,0);assert.equal(f.state.deliveries[0].status,'cancelled');}));
test('uncertain SMTP errors are held and not automatically retried',()=>withSending(async()=>{const f=fakeDB({sendResult:'timeout'});await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.deliveries[0].status,'unknown');await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.sends.length,1);}));
test('definite mail rejections are marked failed',()=>withSending(async()=>{const f=fakeDB({sendResult:'reject'});await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.deliveries[0].status,'failed');}));
test('paused worker does not read or send',()=>withSending(async()=>{const f=fakeDB({enabled:false});await f.run(f.db,f.state.settings,f.now);assert.equal(f.state.claims,0);assert.equal(f.state.sends.length,0);}));
test('cron endpoint rejects unauthenticated requests before accessing database',async()=>{const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='test-cron-secret';try{const route=load('src/app/api/cron/automation/route.ts');assert.equal((await route.GET(new Request('http://localhost/api/cron/automation'))).status,401);}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}});

test('automation management endpoints enforce sign-in and website ownership',async()=>{
 for(const options of [{signedOut:true},{otherOwner:true}]){
  const f=fakeDB(options),local=loader({'@/utils/supabase/server':{createClient:async()=>f.db}}),route=local('src/app/api/automation/route.ts');
  assert.equal((await route.GET(new Request(`http://localhost/api/automation?websiteId=${site}`))).status,options.signedOut?401:403);
 }
});
test('client forms reject invalid expiry dates and recipient injection',async()=>{
 const f=fakeDB(),local=loader({'@/utils/supabase/server':{createClient:async()=>f.db}}),route=local('src/app/api/automation/route.ts');
 for(const changes of [{membership_end_date:'2026-02-30'},{email:'test@example.com\r\nBcc: other@example.com'}]){
  const response=await route.POST(new Request('http://localhost/api/automation',{method:'POST',body:JSON.stringify({websiteId:site,operation:'client',client:{...client,...changes}})}));assert.equal(response.status,400);
 }
});
async function chatFixture(options={},supported=true){
 const f=fakeDB(options),calls=[];const day=model.londonDate(new Date());
 const ai={generateJSON:async(instructions,context)=>{calls.push(context);return calls.length===1?{topic:'expired_enquiries',start:model.addDays(day,-7),end:day,search:'',supported}:{answer:'The matching records appear below.'};}};
 const local=loader({'@/utils/supabase/server':{createClient:async()=>f.db},'@/lib/ai':ai});
 const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only-not-real';
 try{const response=await local('src/app/api/automation/chat/route.ts').POST(new Request('http://localhost/api/automation/chat',{method:'POST',body:JSON.stringify({websiteId:site,question:'Who has an expired enquiry?',history:[{role:'user',content:'Show enquiries'}]})}));return {response,calls};}
 finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
}
test('chatbot validates a read-only plan, returns real matching records, and omits identities from model facts',async()=>{
 const {response,calls}=await chatFixture();assert.equal(response.status,200);const body=await response.json();assert.equal(body.evidence.matchingClients,1);assert.equal(body.evidence.clients[0].email,client.email);assert.equal(calls.length,2);assert.doesNotMatch(JSON.stringify(calls[1].facts),/client@example.com|Example Client/);
});
test('chatbot rejects unauthorized users and exhausted usage before provider calls',async()=>{
 for(const [options,status] of [[{signedOut:true},401],[{otherOwner:true},403],[{limited:true},429]]){const {response,calls}=await chatFixture(options);assert.equal(response.status,status);assert.equal(calls.length,0);}
});
test('chatbot declines unsupported actions without a second provider call',async()=>{const {response,calls}=await chatFixture({},false);assert.equal(response.status,200);assert.equal(calls.length,1);assert.equal((await response.json()).evidence.supported,false);});
