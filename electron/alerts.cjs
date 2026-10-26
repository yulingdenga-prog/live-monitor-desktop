const {randomUUID}=require('node:crypto');
const compare={gte:(v,n)=>v>=n,lte:(v,n)=>v<=n,gt:(v,n)=>v>n,lt:(v,n)=>v<n};
const symbols={gte:'≥',lte:'≤',gt:'>',lt:'<'};
class Alerts{
 constructor({store,send,emit=()=>{},now=Date.now,isMonitoring=()=>true}){Object.assign(this,{store,send,emit,now,isMonitoring});this.queue=Promise.resolve();const history=store.get('alertHistory',[]);if(history.some(x=>x.status==='sending')){for(const x of history)if(x.status==='sending'){x.status='failed';x.detail='软件上次退出时发送尚未确认，请先查看手机，再决定是否重试';}store.set('alertHistory',history);}}
 rules(){return this.store.get('alertRules',[]);}
 public(shop){return {rules:this.rules().filter(r=>r.shop===shop),history:this.store.get('alertHistory',[]).filter(r=>r.shop===shop).slice(-50).reverse()};}
 save(input,choices,shop){
  const prior=this.rules().find(r=>r.id===input.id&&r.shop===shop);
  const choice=choices.find(c=>c.key===input.metricKey);
  if(!choice||choice.shop!==shop)throw Error('请从当前店铺已确认的实时来源选择指标');
  if(typeof input.threshold!=='number'||!Number.isFinite(input.threshold)||!compare[input.operator])throw Error('请填写有效阈值和比较条件');
  const holdSeconds=Number(input.holdSeconds),cooldownMinutes=Number(input.cooldownMinutes);
  if(!Number.isInteger(holdSeconds)||holdSeconds<0||holdSeconds>3600||!Number.isInteger(cooldownMinutes)||cooldownMinutes<1||cooldownMinutes>1440)throw Error('持续时间需0至3600秒，冷却需1至1440分钟');
  if(!prior&&this.rules().filter(r=>r.shop===shop).length>=50)throw Error('每个店铺最多50条提醒');
  const rule={id:prior?.id||randomUUID(),name:String(input.name||choice.label+'提醒').slice(0,80),shop,source:choice.source,scope:choice.scope,label:choice.label,metricKey:choice.key,unit:choice.unit,operator:input.operator,threshold:input.threshold,holdSeconds,cooldownMinutes,enabled:true,createdAt:prior?.createdAt||this.now(),updatedAt:this.now(),runtime:{}};
  this.store.set('alertRules',[...this.rules().filter(r=>r.id!==rule.id),rule]);this.emit({type:'state'});return rule;
 }
 toggle(id,enabled,shop){const list=this.rules(),r=list.find(x=>x.id===id&&x.shop===shop);if(!r)throw Error('提醒不存在');r.enabled=!!enabled;r.runtime={};this.store.set('alertRules',list);this.emit({type:'state'});}
 remove(id,shop){this.store.set('alertRules',this.rules().filter(r=>r.id!==id||r.shop!==shop));this.emit({type:'state'});}
 pause(){const list=this.rules();for(const r of list)r.runtime={...r.runtime,since:null,lastAt:null};this.store.set('alertRules',list);}
 evaluate(snapshot){const task=this.queue.then(()=>this.check(snapshot));this.queue=task.catch(()=>{});return task;}
 async check(p){
  const now=this.now();if(!this.isMonitoring())return;if(p.mode!=='live'||!p.verified||p.referenceOnly||!Number.isFinite(p.at)||now-p.at>90000||p.at>now+5000)return;
  const list=this.rules();const pending=[];let changed=false;
  for(const rule of list){
   if(!rule.enabled||rule.shop!==p.shop||rule.scope!==p.scope||rule.source!==p.source)continue;
   const state=rule.runtime||{},metrics=p.metrics.filter(m=>m.label===rule.label);
   if(state.lastAt!=null&&p.at<=state.lastAt)continue;
   const metric=metrics.length===1?metrics[0]:null;
   if(!metric||typeof metric.value!=='number'||!Number.isFinite(metric.value)){rule.runtime={...state,since:null,lastAt:p.at,status:'指标缺失或有歧义，暂停判断'};changed=true;continue;}
   if(state.lastAt==null||p.at-state.lastAt>90000)state.since=null;
   state.lastAt=p.at;state.value=metric.value;state.raw=metric.raw;changed=true;
   const hit=compare[rule.operator](metric.value,rule.threshold);
   if(!hit){state.latched=false;state.since=null;state.status='未达到条件';}
   else{
    if(state.since==null)state.since=p.at;
    state.status=state.latched?'本次已触发，恢复正常后重新监测':'条件已达到';
    if(!state.latched&&p.at-state.since>=rule.holdSeconds*1000&&(state.lastTrigger==null||now-state.lastTrigger>=rule.cooldownMinutes*60000)){
     state.latched=true;state.lastTrigger=now;state.status='已触发';
     const message=`【直播监测提醒】${rule.name}\n店铺：${rule.shop}\n场次：${rule.scope}\n指标：${rule.label}\n当前：${metric.raw}\n条件：${symbols[rule.operator]} ${rule.threshold}${rule.unit||''}${rule.holdSeconds?'，持续'+rule.holdSeconds+'秒':''}\n采集时间：${new Date(p.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}\n请打开直播间人为观察并判断。\n数据来源：${rule.source}`;
     pending.push({id:randomUUID(),ruleId:rule.id,shop:rule.shop,scope:rule.scope,at:now,value:metric.value,raw:metric.raw,message,status:'sending',name:rule.name});
    }
   }rule.runtime=state;
  }
  if(changed)this.store.set('alertRules',list);
  for(const entry of pending){this.record(entry);await this.deliver(entry);}
  if(changed)this.emit({type:'state'});
 }
 record(entry){this.store.set('alertHistory',[...this.store.get('alertHistory',[]).filter(x=>x.id!==entry.id),entry].slice(-300));}
 async deliver(entry){try{await this.send(entry.message,entry.id);entry.status='accepted';entry.detail='微信接口已接受；请以手机实际收到为准';}catch(e){entry.status='failed';entry.detail=e.message;}entry.completedAt=this.now();this.record(entry);this.emit({type:'state'});return entry;}
 async retry(id,shop){const entry=this.store.get('alertHistory',[]).find(r=>r.id===id&&r.shop===shop);if(!entry||entry.status!=='failed')throw Error('仅可重试失败的提醒');entry.status='sending';this.record(entry);return this.deliver(entry);}
}
function choices(tabs,shop){return tabs.filter(t=>t.source?.confirmed&&t.source.enabled&&t.source.shop===shop&&t.source.mode==='live'&&!t.source.referenceOnly&&t.preview?.exact&&Date.now()-t.lastAt<=90000).flatMap(t=>(t.preview.metrics||[]).filter(m=>typeof m.value==='number'&&Number.isFinite(m.value)&&(t.preview.metrics||[]).filter(x=>x.label===m.label).length===1).map(m=>({key:JSON.stringify([t.url,t.source.scope,m.label]),source:t.url,shop,scope:t.source.scope,label:m.label,value:m.value,raw:m.raw,title:t.title,unit:String(m.raw).includes('%')?'%':/元|金额|成本|消耗/.test(m.label)?'元':'',at:t.lastAt})));}
module.exports={Alerts,choices,compare};
