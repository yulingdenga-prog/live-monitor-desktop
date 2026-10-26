const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function safeDir(root){let p=path.parse(path.resolve(root)).root;for(const part of path.resolve(root).slice(p.length).split(path.sep).filter(Boolean)){p=path.join(p,part);if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error('技能目录不能使用链接');}fs.mkdirSync(root,{recursive:true});return root;}
function checked(root,name){safeDir(root);const p=path.join(root,name);if(fs.existsSync(p)){const s=fs.lstatSync(p);if(s.isSymbolicLink()||!s.isFile()||s.nlink>1)throw Error('技能文件不能使用链接');}return p;}
function atomic(file,value){const tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,value,{encoding:'utf8',flag:'wx'});fs.renameSync(tmp,file);}
function authorizes(text){return !/(?:不要|不用|别|不必).{0,12}(?:保存|学习|更新|写入|录入|并入|记住|skill|技能|记忆)/i.test(text)&&/(?:并入|写入|录入|更新|保存|记住|沉淀|加入|整理成|总结成).{0,30}(?:skill|技能|经验|记忆|方法)|(?:skill|技能|经验|方法).{0,20}(?:更新|保存|录入|记住|完善|改进)/i.test(text);}
class Skills{
 constructor(root){this.root=root;}
 home(shop){return safeDir(path.join(this.root,'profiles',crypto.createHash('sha256').update(shop||'default').digest('hex').slice(0,24)));}
 dir(shop){return safeDir(path.join(this.home(shop),'skills'));}
 file(shop,id){if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id))throw Error('技能ID只允许小写字母、数字、下划线与连字符');return checked(safeDir(path.join(this.dir(shop),id)),'record.json');}
 read(shop,id){const p=this.file(shop,id);if(!fs.existsSync(p))throw Error('技能不存在');return JSON.parse(fs.readFileSync(p,'utf8'));}
 list(shop){const d=this.dir(shop);return fs.readdirSync(d,{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.isSymbolicLink()).map(x=>{try{return this.read(shop,x.name)}catch{return null}}).filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt);}
 save(shop,args,{text='',approved=false}={}){
  const {id,title,description,content,expectedRevision=0}=args;
  if(typeof title!=='string'||!title.trim()||title.length>100||typeof description!=='string'||description.length>300||typeof content!=='string'||content.length<20||content.length>20000)throw Error('技能需有名称、简述和20至20000字的具体方法');
  const file=this.file(shop,id);const old=fs.existsSync(file)?this.read(shop,id):null;
  if((old?.revision||0)!==expectedRevision)throw Error('技能版本已变化，请重新读取再更新');
  if(!old&&this.list(shop).length>=100)throw Error('当前店铺技能已达100条，请完善已有技能');
  const candidate={title:title.trim(),description:description.trim(),content,sources:Array.isArray(args.sources)?args.sources.filter(x=>typeof x==='string').slice(0,20).map(x=>x.slice(0,500)):[],at:Date.now()};
  const record=old||{id,revision:0,history:[],active:null};
  if(approved||authorizes(text)){if(record.active)record.history.push({...record.active,revision:record.revision});record.history=record.history.slice(-15);record.active=candidate;record.pending=null;record.revision++;}else record.pending=candidate;
  record.updatedAt=Date.now();atomic(file,JSON.stringify(record,null,2));this.export(shop,record);
  return {id,title,revision:record.revision,status:record.pending?'待采纳':'已保存',note:record.pending?'尚未作为技能使用；请打开“我的经验 → 助手方法”采纳。':'后续对话会读取该技能。'};
 }
 export(shop,r){const d=path.dirname(this.file(shop,r.id));if(r.active)atomic(checked(d,'SKILL.md'),'---\nname: '+r.id+'\ndescription: '+JSON.stringify(r.active.description)+'\n---\n\n# '+r.active.title+'\n\n'+r.active.content+'\n');}
 review(shop,id,accept){const r=this.read(shop,id);if(!r.pending)throw Error('没有待采纳版本');if(accept)return this.save(shop,{id,...r.pending,expectedRevision:r.revision},{approved:true});r.pending=null;r.updatedAt=Date.now();atomic(this.file(shop,id),JSON.stringify(r,null,2));return {status:'已忽略'};}
 rollback(shop,id){const r=this.read(shop,id);if(!r.history.length)throw Error('没有可回退版本');const previous=r.history.pop();r.active=previous;r.pending=null;r.revision++;r.updatedAt=Date.now();atomic(this.file(shop,id),JSON.stringify(r,null,2));this.export(shop,r);return {status:'已回退',revision:r.revision};}
 index(shop){return this.list(shop).filter(x=>x.active).map(x=>({id:x.id,title:x.active.title,description:x.active.description,revision:x.revision}));}
}
module.exports={Skills,authorizes,safeDir,checked,atomic};
