// Isolated public reader. It never shares merchant sessions or controls the mouse.
const {publicOrigin}=require('./site-access.cjs'),{publicIP}=require('./research-net.cjs');
const dns=require('node:dns/promises');let queue=Promise.resolve();
function read(url){const next=queue.then(()=>load(url));queue=next.catch(()=>{});return next;}
async function load(url){
 if(!publicOrigin(url))throw Error('只读取公开HTTPS网址');
 const {BrowserWindow,session}=require('electron');const partition='public-reader',ses=session.fromPartition(partition,{cache:false}),hosts=new Map();
 ses.setPermissionRequestHandler((_w,_p,cb)=>cb(false));ses.setPermissionCheckHandler(()=>false);const blockDownload=e=>e.preventDefault();ses.on('will-download',blockDownload);
 require('./browser-activity.cjs').install(ses,()=>true,{scope:'publicReader',check:async details=>{if(!publicOrigin(details.url))return false;const host=new URL(details.url).hostname;if(!hosts.has(host))hosts.set(host,dns.lookup(host,{all:true,family:4}).then(a=>a.length>0&&a.every(x=>publicIP(x.address))).catch(()=>false));return hosts.get(host);}});
 const w=new BrowserWindow({show:false,width:1100,height:800,webPreferences:{partition,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));let timer;
 try{return await Promise.race([(async()=>{
  await w.loadURL(url);for(const delay of [350,1000,1800]){
   await new Promise(r=>setTimeout(r,delay));if(w.isDestroyed())throw Error('网页读取已结束');
   const p=await w.webContents.executeJavaScript(`(()=>{let root=document.body;for(const selector of ['#content_views','#mp-editor','.article-content','.article_content','.article-body','article','main','[role="main"]']){const n=document.querySelector(selector);if(n&&n.innerText.length>=180){root=n;break;}}const copy=root.cloneNode(true);copy.querySelectorAll('script,style,nav,footer,header,form,svg,aside,noscript').forEach(x=>x.remove());const text=(copy.innerText||copy.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22000);const links=[...root.querySelectorAll('a[href]')].map(a=>({url:a.href,title:(a.innerText||'').trim().slice(0,150)})).filter(a=>a.title.length>5&&a.url.startsWith('https://')).slice(0,50);const date=document.querySelector('meta[property="article:published_time"],meta[itemprop="datePublished"],meta[name="publishdate"]')?.content;const productBlocks=[...document.querySelectorAll('script[type="application/ld+json"]')].slice(0,20).map(n=>(n.textContent||'').slice(0,150001));return {url:location.href,title:document.title,text,links,date,productBlocks};})()`);
   if(/captcha|人机验证|安全验证|访问验证/i.test(p.title))throw Error('页面要求验证，请换其他公开来源');
   const products=require('./product-evidence.cjs').products(p.productBlocks||[]);delete p.productBlocks;
   if(p.text.length>=180||products.some(x=>p.text.includes(x.name))){const m=String(p.date||'').match(/^20\d{2}-\d{2}-\d{2}/);return {...p,products,publicationDate:m?m[0]:null,checkedAt:Date.now(),reader:'isolated-browser'};}
  }throw Error('公开页面未提供足够正文，请换其他来源');
 })(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('动态网页读取超时')),18000);})]);}
 finally{clearTimeout(timer);if(!w.isDestroyed())w.destroy();ses.removeListener('will-download',blockDownload);ses.webRequest.onBeforeRequest(null);await Promise.allSettled([ses.clearStorageData(),ses.clearCache(),ses.closeAllConnections()]);}
}
module.exports={read};
