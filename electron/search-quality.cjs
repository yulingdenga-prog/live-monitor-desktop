function userRequest(message){
 const parts=typeof message.content==='string'?[message.content]:(message.content||[]).map(x=>x.text||'');
 return parts.map(s=>s.includes('用户问题：')?s.slice(s.lastIndexOf('用户问题：')+5):s).join('\n');
}
function query(raw,messages,text){
 if(typeof raw!=='string')return raw;
 const requests=messages.filter(m=>m.role==='user').map(userRequest).slice(-4).join('\n')+'\n'+text;
 if(/乘方/.test(raw)&&!/数学|指数|幂运算|次方|算术/.test(text+' '+raw)&&/投放|投流|千川|巨量|直播/.test(requests)&&!/千川|巨量|全域/.test(raw))return '巨量千川 '+raw;
 if(/乘方/.test(raw)&&!/数学|指数|幂运算|次方|算术/.test(text+' '+raw)&&/投放|投流|千川|巨量|直播/.test(requests))return raw.replace(/乘方(?!投放)/g,'乘方投放');
 return raw;
}
function filter(results,query){
 if(/菜谱|食谱|数学/.test(query)||!/直播|千川|巨量|投流|投放|电商|带货|淘宝|天猫|抖音|京东|拼多多|比价/.test(query))return results;
 return results.filter(r=>{const s=(r.title||'')+' '+(r.snippet||'');return !/数学|指数运算|幂运算|幂函数|菜谱|食谱|家常菜|下厨房/.test(s)||/直播|千川|巨量|投流|投放|电商|带货/.test(s);});
}
function rank(results,query){
 const terms=[...new Set((String(query).toLowerCase().match(/[a-z]{3,}|[\u4e00-\u9fff]+/g)||[]).flatMap(s=>/^[a-z]/.test(s)?[s]:s.length>2?Array.from({length:s.length-1},(_,i)=>s.slice(i,i+2)):[s]))].filter(t=>!['经验','相关','资料','怎么','如何','方法'].includes(t));
 const seen=new Set();return filter(results,query).filter(r=>{if(seen.has(r.url))return false;seen.add(r.url);return true}).map((r,i)=>{const title=String(r.title||'').toLowerCase(),snippet=String(r.snippet||'').toLowerCase();return {r,i,score:terms.reduce((n,t)=>n+(title.includes(t)?3:snippet.includes(t)?1:0),0)};}).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.r);
}
module.exports={query,filter,rank,userRequest};
