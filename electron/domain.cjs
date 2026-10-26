const crypto=require('node:crypto');
const CUMULATIVE=['综合成本(元)','整体消耗(元)','整体成交金额(元)','净成交金额(元)','整体成交订单数','直播间整体观看人数','直播间商品点击次数'];
function number(raw){const s=String(raw).replace(/[\s,，￥¥]/g,'');const m=s.match(/^(-?\d+(?:\.\d+)?)(万|亿|%|元|人|次|单)?$/);return m?Number(m[1])*({万:1e4,亿:1e8}[m[2]]||1):null;}
function day(t){return new Date(t+8*3600000).toISOString().slice(0,10);}
function classify(url,title='',headings=[]){
 title=title+' '+headings.join(' ');
 let u;try{u=new URL(url);}catch{return 'unknown';}
 if(u.hostname==='qianchuan.jinritemai.com'&&u.pathname==='/board-next')return 'live';
 if(u.hostname==='compass.jinritemai.com')return /核心数据/.test(title)?'compass':/商品/.test(title)?'product':/流量/.test(title)?'traffic':'compass';
 if(u.hostname==='qianchuan.jinritemai.com'&&u.pathname==='/overall-prom')return 'overview';
 if(u.hostname==='qianchuan.jinritemai.com')return /计划|投放管理/.test(title)?'plans':/乘方|全域|数据概览/.test(title)||u.pathname==='/home'?'overview':'unknown';
 return 'unknown';
}
function normalize(input){
 if(!input||!Array.isArray(input.metrics)||input.metrics.length>120)throw Error('采集数据格式异常');
 const metrics=require('./metric-names.cjs').normalize(input.metrics).map(m=>({label:String(m.label).replace(/\s/g,'').slice(0,120),raw:String(m.raw).slice(0,80),value:number(m.raw)})).filter(m=>m.label);
 return {...input,metrics,at:Date.now(),platformTime:input.platformTime||null};
}
function windowDelta(rows,minutes){
 if(!rows.length)return {minutes,issues:['尚无数据'],deltas:{}};
 const latest=rows.at(-1);let base=[...rows].reverse().find(r=>latest.at-r.at>=minutes*60000);
 const issues=[];const deltas={};
 if(Date.now()-latest.at>90000)issues.push('采集中断或历史数据');
 if(!base)issues.push(`尚未积累${minutes}分钟窗口`);
 if(base){
  if(latest.at-base.at>minutes*60000+90000)issues.push('窗口存在采集缺口');
  const segment=rows.filter(r=>r.at>=base.at);if(segment.some((r,i)=>i&&r.at-segment[i-1].at>90000))issues.push('窗口中途断流');
  const old=Object.fromEntries(base.metrics.map(m=>[m.label,m.value]));
  for(const m of latest.metrics)if(CUMULATIVE.includes(m.label)&&m.value!==null&&old[m.label]!=null)deltas[m.label]=Math.round((m.value-old[m.label])*10000)/10000;
  if(['综合成本(元)','整体消耗(元)'].some(k=>deltas[k]<0))issues.push('累计指标回退，需核对口径');
 }
 if(latest.mode!=='live')issues.push('非实时口径');
 if(!latest.shop||!latest.scope)issues.push('店铺或统计范围未确认');
 return {minutes,from:base?.at,to:latest.at,deltas,issues};
}
function hash(x){return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');}
function validAdvice(d){
 const actions=['观察','维持','小额测试','减投建议','暂停建议'];
 if(!d||!actions.includes(d.action)||typeof d.reason!=='string'||!Array.isArray(d.evidence)||!Array.isArray(d.improvements)||typeof d.recheck!=='string')throw Error('模型建议格式不完整，请重试');
 if(d.amount!==null&&(!Array.isArray(d.amount)||d.amount.length!==2||d.amount.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0)||d.amount[0]>d.amount[1]))throw Error('模型金额格式不正确');
 if(!Number.isFinite(d.minutes)||d.minutes<=0)throw Error('缺少观察时长');
 return d;
}
module.exports={number,day,classify,normalize,windowDelta,hash,validAdvice,CUMULATIVE};

function autoSource(p,currentShop){
 if(p.kind!=='live'||!/^\d{6,30}$/.test(p.room||'')||!p.exact)return {reason:'等待识别直播大屏和场次'};
 const shop=(p.shopHint||'').trim();
 if(!shop)return {reason:'已识别场次，等待页面店铺名称加载'};
 if(currentShop&&shop.replace(/\s/g,'')!==currentShop.replace(/\s/g,''))return {reason:'页面店铺与当前店铺不同，请确认切换店铺'};
 const live=/直播中/.test(p.status||'');
 const ended=/已结束|已下播|直播结束/.test(p.status||'');
 if(!live&&!ended)return {reason:'已识别场次，等待页面直播状态加载'};
 return {source:{enabled:true,confirmed:true,shop,scope:p.room,mode:live?'live':'historical',automatic:true}};
}
module.exports.autoSource=autoSource;
