// Optional local runner. Production needs a persistent scheduler, not an open browser.
try { process.loadEnvFile('.env.local'); } catch { /* Hosting may provide environment variables. */ }
const origin=process.env.AUTOMATION_BASE_URL||'http://127.0.0.1:3000';
if(!process.env.CRON_SECRET){console.error('Set CRON_SECRET in the server environment first.');process.exit(1);}
let busy=false;
async function tick(){
 if(busy)return;busy=true;
 try{
  const response=await fetch(new URL('/api/cron/automation',origin),{headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`},signal:AbortSignal.timeout(115000)});
  const result=await response.json();console.log(new Date().toISOString(),response.status,JSON.stringify(result));
 }catch{console.error('Automation check failed. Check that the dashboard server is running.');}finally{busy=false;}
}
await tick();setInterval(tick,60000);
