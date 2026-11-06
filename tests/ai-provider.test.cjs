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
const good={title:'Synthetic result',summary:'Test summary',category:'general',highlights:[],next_steps:[],subject:'',body:'',workouts:[]};
async function gemini(fn){
 const keys=['AI_PROVIDER','GEMINI_API_KEY','GEMINI_MODEL','OPENAI_API_KEY'],before=Object.fromEntries(keys.map(k=>[k,process.env[k]])),originalFetch=global.fetch;
 Object.assign(process.env,{AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-key-not-real',GEMINI_MODEL:'gemini-3.1-flash-lite',OPENAI_API_KEY:'unused-test-openai-key'});
 try{await fn(loader());}finally{global.fetch=originalFetch;for(const key of keys)if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}
}
const completed=value=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]});
test('Gemini uses private headers, JSON schema, and the selected model',()=>gemini(async load=>{
 let request;global.fetch=async(url,options)=>{request={url,options};return completed(good);};
 const ai=load('src/lib/ai.ts');assert.deepEqual(await ai.generateResult('Summarize.',{enquiry:'Synthetic text'}),good);
 assert.equal(request.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');assert.ok(!request.url.includes(process.env.GEMINI_API_KEY));assert.equal(request.options.headers['x-goog-api-key'],process.env.GEMINI_API_KEY);assert.equal(request.options.headers.Authorization,undefined);
 const payload=JSON.parse(request.options.body);assert.equal(payload.generationConfig.responseMimeType,'application/json');assert.equal(payload.generationConfig.responseJsonSchema.additionalProperties,false);assert.match(payload.systemInstruction.parts[0].text,/untrusted data/);
}));
test('Gemini checks its own key and never falls back to OpenAI',()=>gemini(async load=>{
 delete process.env.GEMINI_API_KEY;let calls=0;global.fetch=async()=>{calls++;throw Error('Unexpected network call');};await assert.rejects(load('src/lib/ai.ts').generateJSON('Test',{}),/GEMINI_API_KEY/);assert.equal(calls,0);
}));
test('Gemini quota errors do not call another provider or expose credentials',()=>gemini(async load=>{
 const urls=[];global.fetch=async url=>{urls.push(url);return Response.json({error:{message:'provider details'}},{status:429});};
 await assert.rejects(load('src/lib/ai.ts').generateJSON('Test',{}),error=>error.status===429&&!error.message.includes(process.env.GEMINI_API_KEY));assert.equal(urls.length,1);assert.match(urls[0],/googleapis/);
}));
test('Gemini rejects truncated, blocked and malformed responses',()=>gemini(async load=>{
 const ai=load('src/lib/ai.ts');global.fetch=async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS'}]});await assert.rejects(ai.generateJSON('Test',{}),/incomplete/);
 global.fetch=async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}});await assert.rejects(ai.generateJSON('Test',{}),/could not complete/);
 global.fetch=async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]});await assert.rejects(ai.generateJSON('Test',{}),/valid response/);
}));
test('Gemini handles authentication, missing model and service failures safely',()=>gemini(async load=>{
 const ai=load('src/lib/ai.ts');for(const [status,pattern]of [[403,/credentials/],[404,/model is unavailable/],[500,/rejected the request/]]){global.fetch=async()=>Response.json({error:{}},{status});await assert.rejects(ai.generateJSON('Test',{}),pattern);}
 global.fetch=async()=>{throw Error('network failure with private internals');};await assert.rejects(ai.generateJSON('Test',{}),/timed out or could not be reached/);
}));
test('Gemini output still passes application-level validation',()=>gemini(async load=>{
 global.fetch=async()=>completed({...good,highlights:[123]});await assert.rejects(load('src/lib/ai.ts').generateResult('Test',{}),/invalid result/);
}));
test('Provider metadata and invalid provider configuration are consistent',()=>gemini(async load=>{
 const config=load('src/lib/ai-config.ts');assert.equal(config.providerLabel(),'Google Gemini');assert.equal(config.modelName(),'gemini-3.1-flash-lite');assert.equal(config.isAIConfigured(),true);
 process.env.AI_PROVIDER='invalid-provider';assert.throws(()=>config.aiProvider(),/AI_PROVIDER/);
}));

test('Each workflow schema excludes irrelevant fields and constrains exercise identifiers',()=>gemini(async load=>{
 const ai=load('src/lib/ai.ts');const progress=ai.schemaForAction('progress'),workout=ai.schemaForAction('workout'),reply=ai.schemaForAction('reply');
 assert.equal(progress.properties.workouts.maxItems,0);assert.deepEqual(progress.properties.body.enum,['']);assert.equal(workout.properties.workouts.maxItems,undefined);assert.ok(workout.properties.workouts.items.properties.exercise_id.enum.includes('walk'));assert.ok(!workout.properties.workouts.items.properties.exercise_id.enum.includes('Walking'));assert.equal(reply.properties.body.minLength,1);
 let payload;global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return completed(good);};await ai.generateResult('Summarize progress.',{},'progress');assert.equal(payload.generationConfig.responseJsonSchema.properties.workouts.maxItems,0);
}));

test('Workout array size remains bounded by application validation',()=>gemini(async load=>{
 global.fetch=async()=>completed({...good,workouts:Array.from({length:43},()=>({day:1,exercise_id:'walk',sets:1,reps:'5 minutes',notes:''}))});await assert.rejects(load('src/lib/ai.ts').generateResult('Draft workout.',{},'workout'),/invalid result/);
}));
