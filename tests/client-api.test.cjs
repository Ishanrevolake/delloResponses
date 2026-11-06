const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const crypto=require('node:crypto');
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
const token='graft_read_'+'a'.repeat(64),hash=crypto.createHash('sha256').update(token).digest('hex');
const site='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const pure=loader()('src/lib/client-api.ts');
test('token verification rejects absent, wrong, expired and malformed credentials',()=>{
 const expiry='2099-01-01T00:00:00Z';pure.verifyClientToken('Bearer '+token,hash,expiry);
 for(const auth of [null,'Bearer '+token+'extra','Bearer graft_read_'+'b'.repeat(64),'Basic '+token])assert.throws(()=>pure.verifyClientToken(auth,hash,expiry),error=>error.status===401);
 assert.throws(()=>pure.verifyClientToken('Bearer '+token,hash,'2020-01-01T00:00:00Z'),error=>error.status===401);
 assert.throws(()=>pure.verifyClientToken('Bearer '+token,'bad',expiry),error=>error.status===503);
});
test('query validation prevents scope overrides and unbounded pagination',()=>{
 for(const query of ['website_id='+other,'websiteId='+other,'limit=101','page=0','page=1&page=2','from=2026-02-30','from=2026-11-06&to=2026-01-01'])assert.throws(()=>pure.parseClientQuery(new Request('http://localhost/api?'+query)));
 assert.deepEqual(pure.parseClientQuery(new Request('http://localhost/api?limit=100&page=2')),{page:2,limit:100,from:undefined,to:undefined});
});
test('membership expiry uses UK calendar dates and respects renewals and closure',()=>{
 assert.equal(pure.membershipState({status:'converted',membership_status:'active',membership_end_date:'2026-11-06'},'2026-11-06'),'active');
 assert.equal(pure.membershipState({status:'converted',membership_status:'active',membership_end_date:'2026-11-05'},'2026-11-06'),'expired');
 assert.equal(pure.membershipState({status:'open',membership_status:'renewed',membership_end_date:'2026-11-05'},'2026-11-06'),'renewed');
 assert.equal(pure.membershipState({status:'closed',membership_status:'active',membership_end_date:'2026-11-05'},'2026-11-06'),'closed');
});
test('rate limit is shared by routes and resets after one minute',()=>{
 for(let i=0;i<120;i++)pure.reserveClientRequest('test-limit',100000);assert.throws(()=>pure.reserveClientRequest('test-limit',100001),error=>error.status===429);pure.reserveClientRequest('test-limit',160000);
});
function fixture({badSite=false,dbError=false}={}){
 const today=new Date().toISOString().slice(0,10),past=new Date(Date.now()-86400000).toISOString().slice(0,10),queries=[];
 const tables={websites:[{id:site,name:badSite?'Another business':'GraftGym'}],submissions:[{id:'a',website_id:site,created_at:today+'T09:00:00Z',data:{name:'Graft Client',email:'test@example.invalid',message:'Test'}},{id:'b',website_id:other,created_at:today+'T09:00:00Z',data:{name:'Other Client',email:'other@example.invalid',message:'PRIVATE OTHER SITE'}}],automation_clients:[{id:'m',website_id:site,name:'Graft Member',email:'member@example.invalid',status:'converted',membership_status:'active',membership_end_date:past,do_not_contact:false},{id:'x',website_id:other,name:'Private Member',status:'open',membership_status:'active',membership_end_date:past},{id:'e',website_id:site,name:'Enquiry only',status:'open',membership_status:'active',membership_end_date:null}]};
 const db={from(table){const filters=[];let from=0,to=999;
  const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);if(k==='website_id')queries.push({table,site:v});return q;},neq(k,v){filters.push(r=>r[k]!==v);return q;},not(k,op,v){filters.push(r=>r[k]!==v);return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},lt(k,v){filters.push(r=>r[k]<v);return q;},order(){return q;},range(a,b){from=a;to=b;return q;},maybeSingle:async()=>resolve(true),then(a,b){return Promise.resolve(resolve(false)).then(a,b);}};
  function resolve(single){const rows=(tables[table]||[]).filter(r=>filters.every(fn=>fn(r)));return {data:single?rows[0]||null:rows.slice(from,to+1),count:rows.length,error:dbError?{code:'test'}:null};}return q;
 }};
 const local=loader({'@supabase/supabase-js':{createClient:()=>db}});return {api:local('src/lib/client-api.ts'),queries};
}
async function configured(fn){const values={CLIENT_API_KEY_HASH:hash,CLIENT_API_KEY_EXPIRES_AT:'2099-01-01T00:00:00Z',CLIENT_API_WEBSITE_ID:site,SUPABASE_SERVICE_ROLE_KEY:'test-not-real',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid'};const before=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);try{await fn();}finally{for(const k of Object.keys(values))if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
const request=path=>new Request('http://localhost/api/v1/'+path,{headers:{Authorization:'Bearer '+token}});
test('all three endpoints return only the configured website data',()=>configured(async()=>{
 const f=fixture();for(const [method,path]of [['getClientSubmissions','submissions'],['getClientMemberships','memberships'],['getClientAnalytics','analytics']]){
  const response=await f.api[method](request(path));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store, private');const body=await response.json();assert.doesNotMatch(JSON.stringify(body),/Other Client|Private Member|PRIVATE OTHER SITE/);
  if(path==='submissions'){assert.equal(body.pagination.total,1);assert.equal(body.data[0].name,'Graft Client');}
  if(path==='memberships'){assert.equal(body.pagination.total,1);assert.equal(body.data[0].effective_status,'expired');}
  if(path==='analytics'){assert.equal(body.data.enquiries.total_all_time,1);assert.equal(body.data.enquiries.total_in_period,1);assert.equal(body.data.memberships.recorded,1);assert.equal(body.data.memberships.expired,1);}
 }
 assert.ok(f.queries.length>=3);assert.ok(f.queries.every(query=>query.site===site));
}));
test('invalid keys fail before any data query and return a bearer challenge',()=>configured(async()=>{const f=fixture();const response=await f.api.getClientSubmissions(new Request('http://localhost/api/v1/submissions'));assert.equal(response.status,401);assert.equal(response.headers.get('www-authenticate'),'Bearer realm="GraftGym read API"');assert.equal(f.queries.length,0);}));
test('misconfigured site scope cannot expose another business',()=>configured(async()=>{const response=await fixture({badSite:true}).api.getClientSubmissions(request('submissions'));assert.equal(response.status,503);}));
test('database failures do not expose raw errors',()=>configured(async()=>{const response=await fixture({dbError:true}).api.getClientAnalytics(request('analytics'));assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/test-not-real/);}));
