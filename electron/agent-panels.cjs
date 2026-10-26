const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {confined}=require('./agent-customize.cjs');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function expression(e,depth=0){
 if(depth>12||!e||typeof e!=='object'||Array.isArray(e))throw Error('计算表达式无效或过深');
 if(e.op==='field'){if(typeof e.key!=='string'||!e.key.trim()||e.key.length>150)throw Error('字段名无效');return {op:e.op,key:e.key};}
 if(e.op==='number'){if(!Number.isFinite(e.value))throw Error('常量必须是有限数字');return {op:e.op,value:e.value};}
 if(!['add','subtract','multiply','divide','min','max','gt','lt'].includes(e.op))throw Error('不允许的运算：'+e.op);
 return {op:e.op,left:expression(e.left,depth+1),right:expression(e.right,depth+1)};
}
function calculate(e,fields){
 if(e.op==='number')return e.value;
 if(e.op==='field'){const v=fields[e.key];return typeof v==='number'&&Number.isFinite(v)?v:null;}
 const a=calculate(e.left,fields),b=calculate(e.right,fields);if(a===null||b===null)return null;
 const v=({add:()=>a+b,subtract:()=>a-b,multiply:()=>a*b,divide:()=>b===0?null:a/b,min:()=>Math.min(a,b),max:()=>Math.max(a,b),gt:()=>Number(a>b),lt:()=>Number(a<b)})[e.op]();return Number.isFinite(v)?v:null;
}
function validate(spec){
 if(!spec||typeof spec.title!=='string'||!spec.title.trim()||spec.title.length>60||!Array.isArray(spec.cards)||spec.cards.length<1||spec.cards.length>12)throw Error('面板需标题及1至12张指标卡');
 const cards=spec.cards.map(c=>{if(typeof c.label!=='string'||!c.label.trim()||c.label.length>60)throw Error('指标名称无效');if(c.unit!==undefined&&(typeof c.unit!=='string'||c.unit.length>15))throw Error('单位无效');return {label:c.label,unit:c.unit||'',expression:expression(c.expression)};});
 return {title:spec.title,cards};
}
class Panels{
 constructor(root){this.root=root;}
 read(file,fallback){const p=confined(this.root,file);return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):fallback;}
 write(file,data){const p=confined(this.root,file);fs.mkdirSync(path.dirname(p),{recursive:true});const tmp=confined(this.root,file+'.tmp');fs.writeFileSync(tmp,JSON.stringify(data,null,2),'utf8');fs.renameSync(tmp,p);}
 stage(shop,spec){spec=validate(spec);const id=crypto.randomUUID();this.write('panels/'+id+'.json',{id,shop,spec,hash:digest(spec),at:Date.now(),status:'candidate'});return {id,summary:'面板候选已保存，尚未启用',spec};}
 record(id,shop){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('面板ID无效');const r=this.read('panels/'+id+'.json',null);if(!r||r.shop!==shop)throw Error('当前店铺没有该面板');r.spec=validate(r.spec);return r;}
 test(id,shop,fields,source){const r=this.record(id,shop);const result=r.spec.cards.map(c=>({...c,value:calculate(c.expression,fields)}));r.test={at:Date.now(),hash:digest(r.spec),source,passed:result.every(c=>c.value!==null),results:result.map(({expression,...c})=>c)};r.status=r.test.passed?'tested':'missing-fields';this.write('panels/'+id+'.json',r);return {summary:r.test.passed?'实际数据计算检查通过，尚未启用':'部分字段缺失或计算无效，不能启用',id,test:r.test};}
 apply(id,shop){const r=this.record(id,shop);if(!r.test?.passed||r.test.hash!==digest(r.spec))throw Error('必须先用当前数据测试，修改后需要重测');const active=this.read('panels-active.json',[]),old=active.filter(x=>x.shop===shop);this.write('panels-backup.json',{shop,active:old});this.write('panels-active.json',[...active.filter(x=>x.shop!==shop),{shop,id,spec:r.spec}]);return {summary:'面板已启用，数据资料中可查看；其他店铺不变',id};}
 rollback(shop){const b=this.read('panels-backup.json',null);if(!b||b.shop!==shop)throw Error('当前店铺没有可回退面板');const active=this.read('panels-active.json',[]);this.write('panels-active.json',[...active.filter(x=>x.shop!==shop),...b.active]);return {summary:'已恢复上一次面板版本'};}
 render(shop,fields,source){return this.read('panels-active.json',[]).filter(r=>r.shop===shop).map(r=>({id:r.id,title:r.spec.title,source,cards:validate(r.spec).cards.map(c=>({label:c.label,unit:c.unit,value:calculate(c.expression,fields)}))}));}
}
function inputs(ctx){const fields=Object.create(null),duplicates=new Set();for(const m of ctx.latest?.metrics||[]){if(Object.hasOwn(fields,m.label)){duplicates.add(m.label);continue;}fields[m.label]=typeof m.value==='number'?m.value:null;}for(const key of duplicates)delete fields[key];return {fields,source:{at:ctx.latest?.at||null,mode:ctx.mode,scope:ctx.scope,shop:ctx.shop,note:'仅当前主来源快照；缺失不当0，不合并其他页面或范围'}};}
module.exports={Panels,validate,calculate,inputs};
