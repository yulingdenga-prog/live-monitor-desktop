const {randomUUID}=require('node:crypto');
const profileFields=['goal','products','costs','audience','sellingPoints','budget','constraints'];
const text=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
function shopOf(store,input){const shop=store.get('shop','');if(!shop)throw Error('请先登录并确认店铺，再保存经营记录');if(input&&input.shop!==shop)throw Error('店铺已切换，请重新打开后保存');return shop;}
function profile(store,shop){return store.get('businessProfiles',{})[shop]||{};}
function saveProfile(store,input){const shop=shopOf(store,input),all=store.get('businessProfiles',{}),p={updatedAt:Date.now()};for(const k of profileFields)p[k]=text(input[k],1200);all[shop]=p;store.set('businessProfiles',all);return p;}
function actions(store,shop){return store.get('businessActions',[]).filter(a=>a.shop===shop).sort((a,b)=>b.updatedAt-a.updatedAt);}
function snap(ctx,now=Date.now()){
 const p=ctx?.latest;if(!p||p.shop!==ctx.shop||p.scope!==ctx.scope||p.mode!=='live'||!p.verified||!Number.isFinite(p.at)||now-p.at>90000||now<p.at)return null;
 return {shop:p.shop,scope:p.scope,source:p.source,at:p.at,metrics:(p.metrics||[]).slice(0,120).map(m=>({label:m.label,raw:m.raw,value:Number.isFinite(m.value)?m.value:null}))};
}
function comparison(a,b){
 if(!a||!b)return {rows:[],note:'缺少执行时或复查时的有效实时快照；可手动记录观察结果。'};
 if(a.shop!==b.shop||a.scope!==b.scope||a.source!==b.source||b.at<=a.at)return {rows:[],note:'店铺、场次、来源或时间不一致，不做前后差值。'};
 const rows=[];for(const m of a.metrics){const x=b.metrics.filter(n=>n.label===m.label);if(x.length!==1||a.metrics.filter(n=>n.label===m.label).length!==1)continue;const n=x[0],numeric=Number.isFinite(m.value)&&Number.isFinite(n.value);const ratio=/%/.test(String(m.raw))&&/%/.test(String(n.raw));const level=/ROI|率|占比|人均|平均|在线|千次|UV/i.test(m.label)||ratio;const diff=numeric?Math.round((n.value-m.value)*10000)/10000:null;
 rows.push({label:m.label,before:m.raw,after:n.raw,change:numeric&&(level||diff>=0)?diff:null,unit:ratio?'个百分点':'',note:!numeric?'原始文本':!level&&diff<0?'累计值回退，可能重置，不计算增量':level?'指标前后变化':'采集区间增量'});}
 return {from:a.at,to:b.at,rows,note:'只描述同一来源两个采集时点的变化，未控制流量、价格等因素，不能证明是该动作造成；不等于完整场次结果。'};
}
function saveAction(store,input,ctx){const shop=shopOf(store,input),all=store.get('businessActions',[]),old=input.id?all.find(a=>a.id===input.id&&a.shop===shop):null;if(input.id&&!old)throw Error('行动记录不存在');if(old&&old.status!=='planned')throw Error('已执行记录请通过复查补充结果，不改写原计划');
 const title=text(input.title,100),task=text(input.task,4000),measure=text(input.measure,1000),scope=old?.scope||text(input.scope,500);if(!title||!task)throw Error('请填写行动标题和具体做法');
 const a={...old,id:old?.id||randomUUID(),shop,scope,title,task,measure,status:'planned',createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
 if(input.messageId){const m=store.rows('SELECT id,scope,role FROM messages WHERE id=?',[input.messageId])[0];if(!m||m.role!=='assistant'||!m.scope.startsWith(shop+'::'))throw Error('建议不属于当前店铺');a.messageId=m.id;}
 store.set('businessActions',[...all.filter(x=>x.id!==a.id),a]);return a;
}
function transition(store,input,ctx){const shop=shopOf(store,input),all=store.get('businessActions',[]),a=all.find(x=>x.id===input.id&&x.shop===shop);if(!a)throw Error('行动记录不存在');const now=Date.now();
 if(input.status==='executed'&&a.status==='planned'){
  if(a.scope&&a.scope!==ctx.scope)throw Error('请切换到计划对应场次；下场计划可先取消，再为当前场次新建');
  a.status='executed';a.scope=ctx.scope||a.scope;a.executedAt=now;a.baseline=snap(ctx);a.executionNote=text(input.note,2000);
 }else if(input.status==='reviewed'&&a.status==='executed'){
  const result=text(input.result,4000);if(!result)throw Error('请填写实际观察到的结果；暂时不确定也可以记录');
  a.status='reviewed';a.reviewedAt=now;a.result=result;a.otherChanges=text(input.otherChanges,2000);a.followup=text(input.followup,2000);a.after=ctx.scope===a.scope?snap(ctx):null;a.comparison=comparison(a.baseline,a.after);
 }else if(input.status==='cancelled'&&a.status==='planned'){a.status='cancelled';a.result=text(input.result,2000)||'用户取消计划';}
 else throw Error('该操作不适用于当前行动状态');
 a.updatedAt=now;store.set('businessActions',all);return a;
}
function history(store,shop){if(!shop)return [];const scopes=store.rows('SELECT scope,MIN(at) AS firstAt,MAX(at) AS lastAt,COUNT(*) AS samples FROM snapshots WHERE shop=? GROUP BY scope ORDER BY lastAt DESC LIMIT 12',[shop]);return scopes.map(g=>{const p=JSON.parse(store.rows('SELECT payload FROM snapshots WHERE shop=? AND scope=? ORDER BY at DESC,id DESC LIMIT 1',[shop,g.scope])[0].payload);return {...g,source:p.source,mode:p.mode,metrics:require('./metric-names.cjs').normalize(p.metrics||[]).filter(m=>/成交|成本|ROI|观看|停留|退款|曝光|粉丝/.test(m.label)).slice(0,30),note:'该范围最后采集的单一来源；不是全天合计，数据覆盖及商品投放条件需核对'};});}
function reference(store,shop,scope){const p=profile(store,shop),selected={};for(const k of profileFields)if(p[k])selected[k]=require('./context-budget.cjs').excerpt(p[k],650);return {profile:selected,actions:actions(store,shop).filter(a=>scope===undefined||!a.scope||a.scope===scope).slice(0,4).map(a=>({id:a.id,title:a.title,status:a.status,scope:a.scope,task:text(a.task,500),measure:text(a.measure,200),result:text(a.result,350),otherChanges:text(a.otherChanges,150),followup:text(a.followup,250),executedAt:a.executedAt,reviewedAt:a.reviewedAt})),note:'经营档案由用户填写，未填写不代表0。这里提供近期行动摘要，完整内容在行动记录中；结果是用户观察，不自动证明因果。仅明确参考了具体经验时才注明。'};}

module.exports={profileFields,profile,saveProfile,actions,snap,comparison,saveAction,transition,history,reference};
