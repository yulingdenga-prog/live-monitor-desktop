// Public search runs in an isolated, temporary browser session. No merchant cookies.
const {publicOrigin}=require('./site-access.cjs');
function resultUrl(raw){try{let u=new URL(raw);if(/^(www\.|cn\.)?bing\.com$/.test(u.hostname)&&u.pathname==='/ck/a'){const encoded=u.searchParams.get('u');if(encoded?.startsWith('a1'))u=new URL(Buffer.from(encoded.slice(2),'base64url').toString('utf8'));}if(!publicOrigin(u.href)||u.protocol!=='https:'||u.username||u.password)return null;return u.href;}catch{return null;}}
let queue=Promise.resolve();
function search(query){const job=queue.then(async()=>{try{return await load(query);}catch(e){const broad=query.replace(/\b(?:after|before):\d{4}-\d{2}-\d{2}\b/g,'').trim();if(broad===query||/验证/.test(e.message))throw e;const result=await load(broad);return {...result,query,fallbackReason:'日期搜索无结果，已搜索主题并逐篇核对原文日期'};}});queue=job.catch(()=>{});return job;}
async function load(query){
 const {BrowserWindow,session}=require('electron');const partition='research-search',ses=session.fromPartition(partition,{cache:false});
 ses.setPermissionRequestHandler((_w,_p,cb)=>cb(false));ses.setPermissionCheckHandler(()=>false);
 require('./browser-activity.cjs').install(ses,()=>true,{scope:'publicSearch'});
 const blockDownload=e=>e.preventDefault();ses.on('will-download',blockDownload);
 const w=new BrowserWindow({show:false,width:1100,height:800,webPreferences:{partition,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:true}});
 w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());
 let timer;try{
  return await Promise.race([(async()=>{
   await w.loadURL('https://www.bing.com/search?q='+encodeURIComponent(query));
   for(const delay of [250,750,1500]){
    await new Promise(r=>setTimeout(r,delay));if(w.isDestroyed())throw Error('搜索已结束');
    const raw=await w.webContents.executeJavaScript(`({title:document.title,items:[...document.querySelectorAll('li.b_algo')].slice(0,10).map(li=>{const a=li.querySelector('h2 a');return a?{title:a.innerText,url:a.href,snippet:li.innerText.slice(0,900)}:null}).filter(Boolean)})`);
    if(/captcha|人机验证|安全验证/i.test(raw.title))throw Error('搜索页面要求验证，未绕过');
    const results=raw.items.map(x=>({...x,url:resultUrl(x.url)})).filter(x=>x.url);
    if(results.length)return {query,at:Date.now(),provider:'Bing网页搜索',results};
   }
   throw Error('网页搜索未返回可读取的结果');
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('网页搜索超时')),18000);})]);
 }finally{clearTimeout(timer);if(!w.isDestroyed())w.destroy();ses.removeListener('will-download',blockDownload);ses.webRequest.onBeforeRequest(null);await Promise.allSettled([ses.clearStorageData(),ses.clearCache(),ses.closeAllConnections()]);}
}
module.exports={search,resultUrl};
