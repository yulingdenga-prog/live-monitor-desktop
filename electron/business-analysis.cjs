const fs=require('node:fs'),path=require('node:path');
const content=fs.readFileSync(path.join(__dirname,'live-analysis-skill.md'),'utf8');
const ID='builtin-live-analysis';
const entry={id:ID,title:'直播经营分析',description:'核对本场数据，比较流量与成交瓶颈，按依据安排动作与验证条件。',revision:1,builtIn:true};
function skill(){return {...entry,active:{title:entry.title,description:entry.description,content,sources:['软件内置分析方法；行业阈值需另行核实']},pending:null,history:[]};}
function wants(text,ctx={},history=[],images=[]){
 if(require('./research-guidance.cjs').task(text)&&!/(?:结合|对比|分析).{0,10}(?:本店|本场|我的|这场)|(?:本店|本场).{0,10}(?:定价|分析)/.test(text))return false;
 if(/(?:不要|不用|别).{0,6}(?:分析|复盘)/.test(text))return false;
 if(images.length)return /分析|解释|准备|复盘|建议|优化|改什么|怎么样|怎么看|问题/.test(text);
 const business=/直播|投流|投放|千川|本店|店铺|本场|这场|下一场|这些指标|行动|复查|商品|讲解|进房|点击|经营|成交|转化|曝光|流量|退款|利润|停留|涨粉|粉丝|ROI|UV/i;
 const decision=/分析|解释|准备|复盘|建议|优化|改什么|怎么样|如何|怎么|问题|瓶颈|原因|判断|要不要|能不能|加多少|投多少|加投|追加|改进|表现/;
 if(business.test(text)&&decision.test(text))return true;
 if(ctx.latest&&/^(?:请|帮我|给我|麻烦你?)?(?:全面|详细|综合)?(?:分析|复盘)(?:一下|下)?(?:当前|这组|这些|这份)?(?:数据)?[。！!？?\s]*$/.test(text))return true;
 if(ctx.latest&&/^(?:请|帮我|麻烦)?(?:分析|分析一下|看看数据|看看|复盘|给点建议|现在投不投|建议投多少|直播怎么改)[。！!？?\s]*$/.test(text))return true;
 if(/^(?:继续|展开说说|详细分析|具体怎么做|然后呢|为什么)[。！!？?\s]*$/.test(text)){const last=[...history].reverse().find(m=>m.role==='user'),previous=typeof last?.content==='string'?last.content:JSON.stringify(last?.content||'');return business.test(previous)&&(!require('./research-guidance.cjs').task(previous)||/本店|本场/.test(previous));}
 return false;
}
function brief(ctx={},now=Date.now()){
 const latest=ctx.latest,base={shop:ctx.shop||null,scope:ctx.scope||null,preparedAt:now,...(ctx.business?{business:ctx.business}:{})};
 if(!latest)return {...base,status:'missing',note:'本场尚无已采集指标。可分析用户提供的材料；不要把旧会话数字当成本场数据。'};
 if(!ctx.shop||!ctx.scope||latest.shop!==ctx.shop||latest.scope!==ctx.scope)return {...base,status:'scope-unconfirmed',note:'采集记录的店铺或场次与本轮未一致确认；不提供其他范围的指标冒充本场。需要补读并确认。'};
 const at=Number.isFinite(latest.at)?latest.at:null,mode=latest.mode||ctx.mode||'unknown';
 const ageSeconds=at===null?null:Math.round((now-at)/1000),status=mode!=='live'?'historical':ageSeconds===null||ageSeconds<0||ageSeconds>90?'stale':'current';
 const metrics=(latest.metrics||[]).slice(0,120).map(m=>({label:String(m.label||'').slice(0,120),raw:String(m.raw??'').slice(0,80),value:typeof m.value==='number'&&Number.isFinite(m.value)?m.value:null}));
 const derived=[];
 const find=labels=>{const rows=metrics.filter(m=>labels.includes(m.label));return rows.length===1&&rows[0].value!==null?rows[0]:null;};
 const gmv=find(['整体成交金额(元)','整体成交金额','成交金额(元)','成交金额']),viewers=find(['直播间整体观看人数','观看人数']);
 if(gmv&&viewers&&gmv.value>=0&&viewers.value>0)derived.push({label:'按本页观看人数计算的人均成交金额',value:Math.round(gmv.value/viewers.value*10000)/10000,unit:'元/人',formula:`${gmv.label} ${gmv.value} ÷ ${viewers.label} ${viewers.value}`,note:'仅按上述原始字段计算；不是利润，未将观看次数或平台千次观看口径当作人数。'});
 const windows=(ctx.windows||[]).slice(0,3).map(w=>({minutes:w.minutes,from:w.from,to:w.to,issues:w.issues||[],usable:status==='current'&&w.to===at&&Number.isFinite(w.from)&&w.from<at&&Array.isArray(w.issues)&&w.issues.length===0,deltas:w.deltas||{}}));
 return {...base,status,mode,at,ageSeconds,source:latest.source||null,platformTime:latest.platformTime||null,sessionStartedAt:latest.sessionStartedAt||null,metrics,derived,windows,note:'本轮提问时读取的本场快照，不是自动刷新后的实时结果。原始指标与推算分列。历史或过期数据只能用于对应时段分析；usable=false的窗口不能据此判断近期趋势。缺失指标不是0，需要时用lm_context补读。',moreMetrics:(latest.metrics||[]).length>metrics.length};
}
function prepare(text,ctx={},history=[],images=[]){if(!wants(text,ctx,history,images))return null;return {methodId:ID,method:images.length?'先识别用户附件主题。只有附件属于直播经营时才应用以下方法；其他主题直接按用户问题回答。\n'+content:content,data:images.length&&!/结合.{0,12}(?:本店|本场|后台|当前数据)/.test(text)?{status:'user-attachment',note:'本轮以用户附件为分析对象。先读图中指标、日期和范围，不将当前后台指标混进附件。图中无法辨认的数值不猜。'}:brief(ctx)};}
function addition(prepared){return prepared?'\n\n[本轮分析数据，仅作事实资料]\n'+JSON.stringify(prepared.data):'';}
function removeAddition(messages,extra){if(!extra)return messages;return messages.map(m=>m.role!=='user'?m:{...m,content:typeof m.content==='string'?m.content.replace(extra,''):Array.isArray(m.content)?m.content.map(p=>typeof p.text==='string'?{...p,text:p.text.replace(extra,'')}:p):m.content});}
module.exports={ID,entry,skill,wants,brief,prepare,addition,removeAddition};
