// The model selects observed candidates, never executes selectors or page code.
function discover(){
 const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 const privateLabel=/买家|收货|电话|手机|身份证|地址|密码|密钥|token|cookie|订单号|姓名/i;
 const numeric=s=>/^[¥￥]?\s*-?\d[\d,.]*(?:\s*(?:%|元|万|亿|人|次|单|秒|分钟|小时))?$/.test(s);
 const candidates=[];
 for(const table of document.querySelectorAll('table,[role="table"]')){
  if(!visible(table))continue;
  const headers=[...table.querySelectorAll('thead th,[role="columnheader"]')].map(e=>clean(e.innerText));
  if(!headers.length||headers.length>40||new Set(headers).size!==headers.length)continue;
  const rows=[...table.querySelectorAll('tbody tr,[role="row"]')].map(r=>[...r.querySelectorAll('td,[role="cell"]')]).filter(r=>r.length===headers.length);
  headers.forEach((label,index)=>{
   if(!label||privateLabel.test(label))return;
   const values=rows.slice(0,40).map(r=>clean((r[index].innerText||'').split('\n')[0]));
   if(!values.length||!values.every(numeric))return;
   const entity=headers.findIndex(h=>/^(商品|计划)(名称|信息|ID)$/.test(h));
   const rowLabels=entity<0?[]:rows.slice(0,40).map(r=>clean((r[entity].innerText||'').split('\n')[0]).slice(0,100));
   candidates.push({kind:'column',label,headers,values,rowLabels,coverage:'仅当前已加载表格行，不代表全量',key:JSON.stringify(['column',headers,label])});
  });
 }
 for(const e of document.querySelectorAll('div,span,p,dt')){
  if(candidates.length>=160)break;
  if(!visible(e)||e.children.length||e.closest('table,[role="table"],form'))continue;
  const label=clean(e.innerText);if(!label||label.length>45||privateLabel.test(label)||numeric(label))continue;
  const next=e.nextElementSibling;if(!next||!visible(next)||next.querySelector('input,textarea,button'))continue;
  const value=clean(next.innerText);if(!numeric(value))continue;
  candidates.push({kind:'card',label,values:[value],coverage:'单个页面指标',key:JSON.stringify(['card',label])});
 }
 const counts=new Map();for(const c of candidates)counts.set(c.key,(counts.get(c.key)||0)+1);
 const module=[...document.querySelectorAll('[role="tab"][aria-selected="true"]')].filter(visible).map(e=>clean(e.innerText)).filter(s=>s.length<60&&!privateLabel.test(s)).join(' / ');
 return {url:location.origin+location.pathname,title:document.title,module,candidates:candidates.filter(c=>counts.get(c.key)===1).slice(0,160).map((c,i)=>({...c,id:String(i)}))};
}
function select(observed,ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>20||new Set(ids).size!==ids.length)throw Error('未选出唯一有效的数据字段');
 return ids.map(id=>{const c=observed.candidates.find(c=>c.id===id);if(!c)throw Error('模型选择了页面不存在的字段');return {key:c.key,label:c.label,kind:c.kind};});
}
function extract(observed,rule){
 if(observed.url!==rule.url)throw Error('页面地址已变化');
 if((observed.module||'')!==(rule.module||''))throw Error('数据模块已切换');
 return rule.fields.map(f=>{const matches=observed.candidates.filter(c=>c.key===f.key);if(matches.length!==1)throw Error('字段结构变化或未加载：'+f.label);return matches[0];});
}
module.exports={script:'('+discover.toString()+')()',select,extract};
