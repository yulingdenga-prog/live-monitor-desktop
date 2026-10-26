// Isolated diagnostic only: called by --smoke-test --resource-smoke.
async function run({addTab,tabs,handle,app}){
 const http=require('node:http'),assert=require('node:assert/strict');
 const server=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html><title>资源诊断页面</title><body>本地测试页面<script>window.fixture=new Array(1000000).fill(42)</script></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const metrics=()=>({renderers:app.getAppMetrics().filter(x=>x.type==='Tab').length,workingSetMB:Math.round(app.getAppMetrics().reduce((n,x)=>n+(x.memory?.workingSetSize||0),0)/1024)});
 try{
  for(let i=0;i<4;i++)addTab(url+'/'+i,{background:i>0,source:{enabled:true,confirmed:false,shop:'',scope:''}});
  await Promise.all([...tabs.values()].map(t=>t.loadPromise));await wait(300);
  const initial=[...tabs.values()].filter(t=>!t.suspended).length;assert.equal(initial,1);const lazy=metrics();
  await handle('tab:select',{id:[...tabs.keys()][1]});await Promise.all([...tabs.values()].map(t=>t.loadPromise));assert.equal([...tabs.values()].filter(t=>!t.suspended).length,2);
  await handle('monitor',{enabled:true});await Promise.all([...tabs.values()].map(t=>t.loadPromise));await wait(500);
  assert([...tabs.values()].every(t=>!t.suspended&&t.view.webContents.getURL().startsWith(url)));
  const monitoring=metrics();await handle('monitor',{enabled:false});
  for(const id of [...tabs.keys()])await handle('tab:close',{id});
  return {ok:true,fixturePages:4,initialLoaded:initial,selectedLoaded:2,monitoringLoaded:4,lazy,monitoring,note:'本地测试页，仅验证按需加载和监测唤醒，不代表真实商家页面占用'};
 }finally{server.closeAllConnections();server.close();}
}
module.exports={run};
