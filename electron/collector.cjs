const {ipcRenderer}=require('electron');
const allowed=/^(?:https:\/\/)(?:qianchuan|compass)\.jinritemai\.com\//;
const useful=/消耗|成本|成交|支付|退款|ROI|GPM|曝光|观看|在线|停留|点击|转化|粉丝|评论次数|分享|补贴|优惠券/;
let timer,last=0;
function visible(e){return !!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';}
function sample(){
 if(!allowed.test(location.href)||Date.now()-last<5000)return;last=Date.now();
 const metrics=[];
 for(const el of document.querySelectorAll('.overview-metric-card')){if(!visible(el))continue;const label=el.querySelector('.metric-name')?.innerText?.trim(),raw=el.querySelector('.metric-value')?.innerText?.trim();if(label&&raw&&useful.test(label))metrics.push({label,raw});}
 const exact=metrics.length>4;const tables=[];
 if(!exact){
  for(const table of document.querySelectorAll('table,[role="table"]')){
   if(!visible(table))continue;
   const headers=[...table.querySelectorAll('thead th,[role="columnheader"]')].map(e=>e.innerText.trim());
   const indices=headers.map((h,i)=>useful.test(h)&&!(/买家|收货|电话|姓名|地址|订单号/.test(h))?i:-1).filter(i=>i>=0);
   if(!indices.length)continue;
   const rows=[...table.querySelectorAll('tbody tr,[role="row"]')].slice(0,40).map(row=>{const cells=[...row.querySelectorAll('td,[role="cell"]')];return indices.map(i=>({label:headers[i],raw:(cells[i]?.innerText||'').trim().slice(0,80)})).filter(c=>/^[\d\s,.，%元人次单万亿¥￥+\-—]+$/.test(c.raw));}).filter(r=>r.length);
   if(rows.length)tables.push({headers:indices.map(i=>headers[i]),rows});
  }
  for(const el of document.querySelectorAll('[class*="metric"],[class*="indicator"]')){
   if(metrics.length>=80)break;if(!visible(el)||el.children.length>5)continue;
   const text=el.innerText?.trim()||'';const lines=text.split(/\n/).map(x=>x.trim()).filter(Boolean);
   if(lines.length===2&&lines[0].length<50&&useful.test(lines[0])&&/^[\d\s,.%元万亿人次单¥￥\-—]+$/.test(lines[1]))metrics.push({label:lines[0],raw:lines[1]});
  }
 }
 const u=new URL(location.href);const status=document.querySelector('.room-status')?.innerText?.trim()||'';
 const shop=document.querySelector('[class*="shop-name"],[class*="company-name"]')?.innerText?.trim().slice(0,100)||'';
 const dates=[...document.querySelectorAll('input')].filter(e=>visible(e)&&/date|日期/.test((e.className||'')+' '+(e.placeholder||''))).map(e=>e.value).filter(x=>/^\d{4}[-/]\d{2}[-/]\d{2}/.test(x)).slice(0,2);
 ipcRenderer.send('collector:snapshot',{url:u.origin+u.pathname,title:document.title.slice(0,120),room:u.searchParams.get('live_room_id')||'',shopHint:shop,status,dates,metrics:metrics.slice(0,120),tables:tables.slice(0,4),exact,coverage:exact?'大屏可见指标':'候选字段，仅已加载部分；需确认',platformTime:null});
}
ipcRenderer.on('collector:sample',sample);
addEventListener('DOMContentLoaded',()=>{sample();const ob=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(sample,1800);});ob.observe(document.body,{subtree:true,childList:true,characterData:true});});
setInterval(sample,30000);
