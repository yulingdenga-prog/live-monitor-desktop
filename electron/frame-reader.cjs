function readFrame(){
 const interactionKey=Symbol.for('live-monitor-user-interaction');
 if(typeof window!=='undefined'&&!window[interactionKey]){window[interactionKey]={count:0};for(const name of ['pointerdown','keydown'])window.addEventListener(name,e=>{if(e.isTrusted)window[interactionKey].count++;},true);}
const useful=/消耗|成本|成交|支付|退款|ROI|GPM|曝光|观看|在线|停留|点击|转化|粉丝|评论次数|分享|补贴|优惠券|预算|出价|投产|订单/;
function visible(e){return !!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';}
 const metrics=[],labelStructures=[];
 const metricName=/^(?:账户整体消耗|乘方计划消耗|标准投放消耗|全域投放消耗|品牌投放消耗|综合成本|综合营销ROI|实时在线人数|整体成交订单数|净成交金额|净成交订单数|用户实际支付净成交金额|整体成交金额|整体消耗|综合订单成本|成交金额|支付金额|成交订单数|支付订单数|成交人数|支付人数|商品点击次数|商品曝光次数|商品点击率|点击率|点击次数|曝光次数|曝光人数|观看人数|观看次数|进房人数|访客数|访客人数|商品访客数|商品浏览量|商品成交金额|商品成交订单数|客单价|退款金额|退款率|转化率|成交转化率|支付转化率|千次观看成交金额|GPM|ROI|消耗|广告消耗)(?:[（(](?:元|%|人|次|单)[）)])?$/i;
 const numeric=/^[¥￥]?\s*(?:\d[\d,，]*(?:\.\d+)?)(?:\s*(?:%|元|人|次|单|万|亿|万元|万次|万人))?$/;

 for(const el of document.querySelectorAll('.overview-metric-card')){if(!visible(el))continue;const label=el.querySelector('.metric-name')?.innerText?.trim(),raw=el.querySelector('.metric-value')?.innerText?.trim();if(label&&raw&&useful.test(label))metrics.push({label,raw});}
 let exact=location.hostname==='qianchuan.jinritemai.com'&&location.pathname==='/board-next'&&metrics.length>4;const tables=[];
 if(!exact){
  for(const table of document.querySelectorAll('table,[role="table"]')){
   if(!visible(table))continue;
   let headerRoot=table;
   for(let i=0;!headerRoot.querySelectorAll('thead th,[role="columnheader"]').length&&headerRoot.parentElement&&i<5;i++)headerRoot=headerRoot.parentElement;
   if(headerRoot.querySelectorAll('thead').length>1)continue;
   const headers=[...headerRoot.querySelectorAll('thead th,[role="columnheader"]')].map(e=>(e.innerText||'').trim().replace(/\s/g,''));
   const entity=/^(计划|商品)(名称|信息|ID|状态)$|^投放(状态|目标)$/;
   const indices=headers.map((h,i)=>(useful.test(h)||entity.test(h))&&!(/买家|收货|电话|姓名|地址|订单号/.test(h))?i:-1).filter(i=>i>=0);
   if(!indices.length)continue;
   const rows=[...table.querySelectorAll('tbody tr,[role="row"]')].slice(0,40).map(row=>{
    const cells=[...row.querySelectorAll('td,[role="cell"]')];if(cells.length!==headers.length)return [];
    return indices.map(i=>{const lines=(cells[i]?.innerText||'').split(/\n/).map(x=>x.trim()).filter(Boolean);let raw=lines[0]||'';
     if(/^\.\d+$/.test(lines[1]||''))raw+=lines[1];
     return {label:headers[i],raw:raw.slice(0,120)};
    }).filter(c=>entity.test(c.label)||/^[\d\s,.，%元人次单万亿¥￥+\-—]+$/.test(c.raw));
   }).filter(r=>r.some(c=>!entity.test(c.label)&&/\d/.test(c.raw)));
   if(rows.length){
    let root=headerRoot,pagination=null;
    for(let depth=0;root&&depth<6;depth++,root=root.parentElement){
     const pagers=[...root.querySelectorAll('[class*="pagination"]')].filter(e=>visible(e)&&/共\s*\d+\s*条/.test(e.innerText||'')&&[...e.querySelectorAll('li,button,[role="button"]')].some(c=>/^\d+$/.test((c.innerText||'').trim())));
     const pager=pagers.find(e=>!pagers.some(x=>x!==e&&e.contains(x)));
     if(pager){pagination={index:[...document.querySelectorAll('[class*="pagination"]')].indexOf(pager),text:(pager.innerText||'').slice(0,240),className:String(pager.className),controls:[...pager.querySelectorAll('li,button,[role="button"]')].map(e=>({text:(e.innerText||'').trim().slice(0,30),className:String(e.className),title:e.getAttribute('title'),aria:e.getAttribute('aria-label'),current:e.getAttribute('aria-current'),disabled:e.getAttribute('aria-disabled')})).slice(0,30)};break;}
    }
    let timeRoot=headerRoot,timeScope=null;const timeDiagnostics=[];
    for(let depth=0;timeRoot&&depth<16;depth++,timeRoot=timeRoot.parentElement){
     const selected=[...timeRoot.querySelectorAll('[role="tab"][aria-selected="true"]')].filter(visible).map(e=>(e.innerText||'').trim()).filter(x=>/^(实时|近1天|近7天|近30天|今日|昨日|自定义)$/.test(x));
     timeDiagnostics.push({depth,className:String(timeRoot.className||'').slice(0,120),selected,stamps:[...new Set((timeRoot.innerText||'').match(/\d{4}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}:\d{2}/g)||[])].slice(0,8)});
     if(selected.length>1)break;
     if(selected.length!==1)continue;
     if(!timeScope)timeScope={selectedPeriod:selected[0],platformDisplayedTime:null,dateMeaning:'已识别所选周期，未显示明确日期范围',rangeVerified:false};
     const text=timeRoot.innerText||'';
     const stamps=[...text.matchAll(/\b(\d{4}[/-]\d{2}[/-]\d{2})\s+(\d{2}:\d{2}:\d{2})\b/g)].map(m=>m[1].replace(/\//g,'-')+' '+m[2]);
     const unique=[...new Set(stamps)];
     if(unique.length===1){timeScope={selectedPeriod:selected[0],platformDisplayedTime:unique[0],dateMeaning:'同一表格模块显示的时间；不作为查询起止日期',rangeVerified:false};break;}
    }
    tables.push({headers:indices.map(i=>headers[i]),rows,pagination,timeScope,timeDiagnostics});
   }
  }
  for(const el of document.querySelectorAll('[class*="metric"],[class*="indicator"],[class*="statistic"],[class*="data-card"]')){
   if(metrics.length>=80)break;if(!visible(el)||el.children.length>5)continue;
   const text=el.innerText?.trim()||'';const lines=text.split(/\n/).map(x=>x.trim()).filter(Boolean);
   if(lines.length===2&&lines[0].length<50&&useful.test(lines[0])&&/^[\d\s,.%元万亿人次单¥￥\-—]+$/.test(lines[1]))metrics.push({label:lines[0],raw:lines[1]});
  }
 }
 // Inspect compact label/value containers without relying on generated CSS class names.
 {
  const canonical=x=>String(x).replace(/\s/g,'').replace(/（/g,'(').replace(/）/g,')').replace(/\(元\)$/,'').toLowerCase();
  const seen=new Set(metrics.map(m=>m.label+'|'+m.raw));
  for(const el of [...document.querySelectorAll('span,div,p,dt,label')]){
   if(metrics.length>=120||!visible(el)||el.closest?.('table,[role="table"],form'))continue;
   const label=(el.innerText||'').replace(/\s/g,'');if(!metricName.test(label))continue;
   if(metrics.some(m=>canonical(m.label)===canonical(label)&&numeric.test(m.raw.replace(/\s/g,''))))continue;
   let parent=el.parentElement;
   for(let depth=0;parent&&depth<3;depth++,parent=parent.parentElement){
    const lines=(parent.innerText||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(lines.join('').length>240)break;
    const index=lines.findIndex(x=>x.replace(/\s/g,'')===label);
    // Only an immediate numeric value; comparison percentages must not substitute for missing values.
    let raw=index>=0?lines[index+1]||'':'';if(/^\.\d+(?:[%元万人次单亿]*)$/.test(lines[index+2]||''))raw+=lines[index+2];
    if(labelStructures.length<40)labelStructures.push({label,tag:parent.tagName,className:String(parent.className||'').slice(0,180),lineCount:lines.length,nextIsNumeric:numeric.test(raw),valueLines:lines.slice(index+1,index+7).filter(x=>/^[\d\s,.，%元人次单万亿¥￥+\-—]+$/.test(x))});
    if(index>=0&&numeric.test(raw)&&lines.filter(x=>metricName.test(x.replace(/\s/g,''))).length===1){
     const key=label+'|'+raw;if(!seen.has(key)){const same=metrics.filter(m=>canonical(m.label)===canonical(label));if(same.length){for(const m of same)if(!numeric.test(m.raw.replace(/\s/g,'')))m.raw=raw;}else metrics.push({label,raw});seen.add(key);}break;
    }
   }
  }
 }
 // Fully changed classes can still be identified by all four independently read core labels on the live-board URL.
 if(!exact&&location.hostname==='qianchuan.jinritemai.com'&&location.pathname==='/board-next'&&/^\d{6,30}$/.test(new URL(location.href).searchParams.get('live_room_id')||'')){
  const key=x=>String(x).replace(/\s/g,'').replace(/（/g,'(').replace(/）/g,')').replace(/\((?:元|人)\)$/,'').toLowerCase();
  exact=['综合成本','净成交金额','综合营销roi','实时在线人数'].every(k=>metrics.some(m=>key(m.label)===k&&numeric.test(m.raw.replace(/\s/g,''))));
 }
 const u=new URL(location.href);const headerText=(document.body?.innerText||'').slice(0,3000);const status=document.querySelector('.room-status')?.innerText?.trim()||headerText.match(/直播中|已结束|已下播|直播结束/)?.[0]||'';
 const shop=document.querySelector('[class*="shop-name"],[class*="company-name"]')?.innerText?.trim().slice(0,100)||headerText.match(/[\u4e00-\u9fffA-Za-z0-9（）()·]{2,70}(?:有限责任公司|有限公司)/)?.[0]||'';
 const dates=[...document.querySelectorAll('input')].filter(e=>visible(e)&&/date|日期/.test((e.className||'')+' '+(e.placeholder||''))).map(e=>e.value).filter(x=>/^\d{4}[-/]\d{2}[-/]\d{2}/.test(x)).slice(0,2);
 const headings=[...document.querySelectorAll('h1,h2,[role=tab][aria-selected=true]')].filter(visible).map(e=>e.innerText.trim().slice(0,60)).slice(0,12);
 const startMatch=u.hostname==='qianchuan.jinritemai.com'&&u.pathname==='/board-next'?headerText.match(/开播时间\s*[:：]?\s*(\d{4}[-/]\d{2}[-/]\d{2})\s+(\d{2}:\d{2}:\d{2})/):null;
 return ({sessionStartedAt:startMatch?startMatch[1].replace(/\//g,'-')+'T'+startMatch[2]+'+08:00':null,accountHint:u.searchParams.get('aavid')||'',diagnostics:{readyState:document.readyState||'unknown',frameCount:document.querySelectorAll('iframe').length,canvasCount:document.querySelectorAll('canvas').length,tableCount:document.querySelectorAll('table,[role=table]').length,labelStructures,metricClues:[...document.querySelectorAll('span,div,p')].filter(e=>visible(e)&&(e.children?.length||0)<3&&useful.test(e.innerText||'')&&(e.innerText||'').length<80&&!e.closest?.('table,form,[role=table]')).filter(e=>!e.closest?.('[class*=slick-cloned]')).sort((a,b)=>Number(metricName.test((b.innerText||'').replace(/\s/g,'')))-Number(metricName.test((a.innerText||'').replace(/\s/g,'')))).slice(0,160).map(e=>({text:(e.innerText||'').trim(),className:String(e.className||'').slice(0,150),parentClass:String(e.parentElement?.className||'').slice(0,150)}))},headings,url:u.origin+u.pathname,title:document.title.slice(0,120),room:u.searchParams.get('live_room_id')||'',shopHint:shop,status,dates,metrics:metrics.slice(0,120),tables:tables.slice(0,4),exact,coverage:exact?'大屏可见指标':'候选字段，仅已加载部分；需确认',platformTime:null});
}

module.exports={script:'('+readFrame.toString()+')()',readFunction:readFrame.toString()};
