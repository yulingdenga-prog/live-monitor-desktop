const {readFunction}=require('./frame-reader.cjs');
function productState(p,interaction=0){
 if(p.url!=='https://compass.jinritemai.com/shop'||!p.shopHint)return null;
 const matches=p.tables.filter(t=>t.headers.includes('商品信息')&&t.headers.includes('用户支付金额')&&t.pagination);
 if(matches.length!==1)return null;
 const table=matches[0],pager=table.pagination;
 const numeric=pager.controls.filter(c=>/^\d+$/.test(c.text));
 const active=numeric.filter(c=>c.current==='page'||c.current==='true'||/(?:^|[-_\s])(active|selected|current)(?:$|[-_\s])/.test(c.className));
 if(active.length!==1||numeric.length<2)return null;
 const page=Number(active[0].text),total=Number(pager.text.match(/共\s*(\d+)\s*条/)?.[1]);
 if(!total||total>1000||!Number.isInteger(page)||page<1)return null;
 const next=pager.controls.find(c=>/next/i.test(c.className+' '+c.aria+' '+c.title));
 if(!next)return null;
 const last=next.disabled==='true'||/disabled/.test(next.className);
 return {...p,page,rows:table.rows,table,pager,total,last,interaction,tablePeriod:table.timeScope?.selectedPeriod||null};
}
const readScript=`(()=>{const p=(${readFunction})();return (${productState.toString()})(p,window[Symbol.for('live-monitor-user-interaction')]?.count||0)})()`;
function goScript(expected,target){
 // Numeric page controls only. No next-button label guessing, links, or other business actions.
 return `(()=>{const state=${readScript};const expected=${JSON.stringify({url:expected.url,shopHint:expected.shopHint,dates:expected.dates,headings:expected.headings,interaction:expected.interaction,page:expected.page,rows:expected.rows})};if(!state||Object.keys(expected).some(k=>JSON.stringify(state[k])!==JSON.stringify(expected[k])))return false;const pager=[...document.querySelectorAll('[class*="pagination"]')][state.pager.index];if(!pager)return false;const controls=[...pager.querySelectorAll('li,button,[role="button"]')].filter(e=>(e.innerText||'').trim()===${JSON.stringify(String(target))}&&!e.querySelector('a[href]')&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!/disabled/.test(String(e.className)));if(controls.length!==1)return false;controls[0].click();return true;})()`;
}
module.exports={productState,readScript,goScript};
