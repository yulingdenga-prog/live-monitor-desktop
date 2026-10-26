const crypto=require('node:crypto');
const K=require('./knowledge.cjs');
const clean=x=>String(x||'').replace(/\s+/g,'').trim();
const visible=(x,shop)=>x.shop===undefined||x.shop===shop;
function draft(store,a){
 const shop=store.get('shop','');let text='',sources=[],title='运营经验';
 if(a.kind==='message'){
  const m=store.rows('SELECT * FROM messages WHERE id=?',[a.id])[0];
  if(!m||m.role!=='assistant'||!m.scope.startsWith(shop+'::'))throw Error('这条回答不属于当前店铺');
  text=m.content;title='对话经验';
 }else if(a.kind==='learning'){
  const s=[store.get('learningState',{}),...store.get('learningHistory',[])].find(s=>s.at===a.id&&visible(s,shop));
  if(!s?.answer)throw Error('学习结果已变化，请重新打开');
  text=s.answer;sources=(s.sources||[]).map(x=>x.url);title=s.query||title;
 }else if(a.kind==='action'){
  const x=require('./operations.cjs').actions(store,shop).find(x=>x.id===a.id&&x.status==='reviewed');if(!x)throw Error('请先记录当前店铺的行动结果');title=x.title;text=['场次：'+(x.scope||'未确定'),'尝试：'+x.task,'复查条件：'+x.measure,'观察结果：'+x.result,'同期变化：'+(x.otherChanges||'未记录'),'下一步：'+(x.followup||'未记录'),'用户记录的实践案例；单次结果不证明通用因果。'].join('\n\n');
 }else throw Error('不支持的经验来源');
 const excerpt=typeof a.excerpt==='string'?a.excerpt.trim():'';
 if(excerpt&&excerpt.length<=12000)text=excerpt;
 return {title:title.slice(0,80),text,sources,origin:{kind:a.kind,id:a.id},shop};
}
function save(store,a){
 const origin=draft(store,a.origin||{}),shop=store.get('shop','');
 if(a.shop!==shop)throw Error('店铺已切换，请重新打开经验编辑');
 const text=typeof a.text==='string'?a.text.trim():'',title=typeof a.title==='string'?a.title.trim():'';
 if(!title||title.length>80||text.length<12||text.length>12000)throw Error('请填写标题和12至12000字的经验内容');
 const items=store.get('knowledge',[]);const existing=items.find(x=>visible(x,shop)&&clean(x.text)===clean(text)&&x.status==='active');
 if(existing)return {id:existing.id,status:'已保存',duplicate:true};
 const id=crypto.randomUUID();items.push({id,shop,title,text,topic:'运营经验',action:'按记录中的适用条件执行，结合本店数据验证',appliesTo:'以本条记录中的限制为准',sources:origin.sources,url:origin.sources[0]||'',origin:origin.origin,evidence:origin.origin.kind==='action'?'用户记录的实践案例；单次结果不证明通用因果':'用户采纳的建议；未经店铺实测，不是已验证规律',practice:origin.origin.kind==='action',status:'active',at:Date.now(),approvedAt:Date.now(),expiresAt:null});
 store.set('knowledge',items);K.save(store);return {id,status:'已保存',duplicate:false};
}
function candidateFromAnswer(store,{answer,query,sources=[],shop,at}){
 if(typeof answer!=='string'||answer.trim().length<20)return {added:0};
 const list=store.get('knowledgeCandidates',[]),accepted=store.get('knowledge',[]);
 if([...list,...accepted].some(x=>visible(x,shop)&&clean(x.text)===clean(answer)))return {added:0};
 if(list.filter(x=>x.status==='pending'&&visible(x,shop)).length>=30)return {added:0};
 const id=crypto.createHash('sha256').update(shop+'|summary|'+clean(answer)).digest('hex').slice(0,24);
 list.push({id,shop,title:query.slice(0,80),topic:'运营经验',text:answer.slice(0,12000),action:'先小范围验证文中建议，记录实际结果',appliesTo:'研究总结中的适用条件；不可直接当作本店有效结论',sources:sources.map(x=>x.url),url:sources[0]?.url||'',quote:'',evidence:'研究总结候选，未经店铺实测；非逐字原文证据',status:'pending',at,expiresAt:null,origin:{kind:'learning',id:at}});
 store.set('knowledgeCandidates',list);return {added:1};
}
function skills(store,shop){return store.get('knowledge',[]).filter(x=>visible(x,shop)&&x.status==='active'&&(!x.expiresAt||x.expiresAt>Date.now())).map(x=>({id:'experience-'+x.id,title:x.title||'经营经验',description:(x.text||'').slice(0,140),revision:1,experience:true}));}
function readSkill(store,shop,id){
 const x=store.get('knowledge',[]).find(x=>'experience-'+x.id===id&&visible(x,shop)&&x.status==='active'&&(!x.expiresAt||x.expiresAt>Date.now()));
 if(!x)throw Error('经验已停用、到期或不属于当前店铺');
 return {id,revision:1,history:[],pending:null,experience:true,active:{title:x.title||'经营经验',description:(x.text||'').slice(0,140),content:[x.text,x.action&&'建议行动：'+x.action,x.appliesTo&&'适用条件：'+x.appliesTo,'证据边界：'+(x.evidence||'来源记录；采纳不代表本店实测有效')].filter(Boolean).join('\n\n'),sources:x.sources||[x.url].filter(Boolean)}};
}
module.exports={draft,save,candidateFromAnswer,skills,readSkill,visible};
