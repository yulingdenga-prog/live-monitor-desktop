// Only observed data-navigation destinations. Never run a site's onclick handler
// for a link: navigate its verified URL in a separate persistent-session tab.
function allowedUrl(raw,origins=[]){
 try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
 if(!['qianchuan.jinritemai.com','compass.jinritemai.com','business.oceanengine.com'].includes(u.hostname)&&!origins.includes(u.origin))return false;
 const decoded=decodeURIComponent(u.pathname+u.search+u.hash);
 if(/delete|remove|create|update|edit|submit|pay(?:ment)?|recharge|checkout|publish|logout|authorize|token|secret|callback|redirect|充值|删除|修改|创建|支付|购买/i.test(decoded))return false;
 return /board|report|analysis|analy[sz]e|statistic|overview|data|detail|insight|dashboard|overall-prom|docx?\/|wiki\/|article|manual|help|^\/shop(?:[?#/]|$)|screen\/live/i.test(decoded);
 }catch{return false;}
}
function inspect(){
 const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const denied=/删除|修改|编辑|创建|新建|投放|充值|支付|购买|提交|发布|启用|停用|暂停|启动|授权|退出|保存|上架|下架|预算|出价/;
 const data=/数据|分析|报表|统计|详情|明细|趋势|看商品|看流量|看搜索|直播大屏|核心数据|成交概览|流量来源|商品表现|手册|说明|文档|规则|指南|政策/;
 const links=[];
 for(const e of document.querySelectorAll('a[href],[role="tab"]')){
  const label=(e.innerText||'').replace(/\s+/g,' ').trim();
  if(!visible(e)||!label||label.length>60||denied.test(label)||!data.test(label)||e.closest('form'))continue;
  if(e.tagName==='A'){try{const url=new URL(e.getAttribute('href'),location.href).href;links.push({kind:'link',label,url});}catch{}}
  else if(e.getAttribute('role')==='tab'&&e.getAttribute('aria-disabled')!=='true'&&!e.querySelector('button,input,a[href]'))links.push({kind:'tab',label});
 }
 for(const e of document.querySelectorAll('[aria-label],button,[role="button"],li')){
  const parent=e.closest('[class*="pagination"],[class*="Pagination"],[role="navigation"][aria-label*="分页"]');
  if(!parent||!visible(e)||e.closest('form')||e.querySelector('a,button,[role="button"]'))continue;
  const label=(e.getAttribute('aria-label')||e.innerText||'').trim();
  if(!/^(?:下一页|上一页|Next(?: page)?|Previous(?: page)?|[1-9]\d{0,2})$/i.test(label)||e.disabled||e.getAttribute('aria-disabled')==='true'||/disabled/.test(e.className))continue;
  links.push({kind:'page',label});
 }
 const count=new Map();for(const l of links){const key=JSON.stringify(l);count.set(key,(count.get(key)||0)+1);}
 return {url:location.href,links:links.filter(l=>count.get(JSON.stringify(l))===1).slice(0,80)};
}
function tabClick(expected){
 if(location.href!==expected.page)return false;
 const nodes=[...document.querySelectorAll('[role="tab"]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&(e.innerText||'').replace(/\s+/g,' ').trim()===expected.label);
 if(nodes.length!==1)return false;const e=nodes[0];
 if(e.getAttribute('aria-disabled')==='true'||e.closest('form')||e.querySelector('button,input,a[href]'))return false;
 if(e.getAttribute('aria-selected')!=='true')e.click();return true;
}
function scroll(direction){
 const candidates=[document.scrollingElement,...document.querySelectorAll('main,[role="main"],[class*="scroll"],[class*="Scroll"]')].filter(e=>e&&e.getClientRects().length&&e.scrollHeight>e.clientHeight+20);
 candidates.sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight);const e=candidates[0];if(!e)return {moved:false,reason:'未找到可滚动内容'};
 const before=e.scrollTop;e.scrollBy({top:(direction==='up'?-1:1)*Math.max(200,e.clientHeight*.8),behavior:'instant'});return {moved:before!==e.scrollTop,position:e.scrollTop};
}
function pageClick(expected){
 if(location.href!==expected.page)return false;
 const nodes=[...document.querySelectorAll('[aria-label],button,[role="button"],li')].filter(e=>e.closest('[class*="pagination"],[class*="Pagination"],[role="navigation"][aria-label*="分页"]')&&e.getClientRects().length&&!e.closest('form')&&!e.querySelector('a,button,[role="button"]')&&(e.getAttribute('aria-label')||e.innerText||'').trim()===expected.label&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!/disabled/.test(e.className));
 if(nodes.length!==1||!/^(?:下一页|上一页|Next(?: page)?|Previous(?: page)?|[1-9]\d{0,2})$/i.test(expected.label))return false;nodes[0].click();return true;
}
module.exports={scrollScript:direction=>'('+scroll.toString()+')('+JSON.stringify(direction)+')',pageScript:expected=>'('+pageClick.toString()+')('+JSON.stringify(expected)+')',allowedUrl,script:'('+inspect.toString()+')()',tabScript:expected=>'('+tabClick.toString()+')('+JSON.stringify(expected)+')'};
