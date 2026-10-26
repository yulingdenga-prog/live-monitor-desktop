const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const defaults={fontSize:16,chatWidth:38,compact:false,accent:'#c2a159'};
function validateUI(input){
 const next={};for(const [key,value] of Object.entries(input)){
  if(key==='fontSize'&&Number.isInteger(value)&&value>=13&&value<=22)next[key]=value;
  else if(key==='chatWidth'&&Number.isInteger(value)&&value>=28&&value<=60)next[key]=value;
  else if(key==='compact'&&typeof value==='boolean')next[key]=value;
  else if(key==='accent'&&typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value))next[key]=value;
  else throw Error('界面参数不支持：'+key);
 }if(!Object.keys(next).length)throw Error('没有界面修改内容');return next;
}
// All writable artifacts remain under AgentWorkspace. Refuse links at every
// ancestor and hard-linked files. Never execute model-authored code.
function confined(root,relative){
 if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||relative.startsWith('/')||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('禁止访问软件工作区之外的路径');
 const base=path.resolve(root),target=path.resolve(base,relative);if(!target.startsWith(base+path.sep))throw Error('路径越界');
 let current=path.parse(target).root;for(const part of target.slice(current.length).split(path.sep)){current=path.join(current,part);if(fs.existsSync(current)){const s=fs.lstatSync(current);if(s.isSymbolicLink()||s.isFile()&&s.nlink>1)throw Error('不允许链接或硬链接路径');}}
 return target;
}
class Customizer{
 constructor(sourceRoot,workspace){this.sourceRoot=sourceRoot;this.workspace=workspace;}
 readUI(){const p=confined(this.workspace,'ui.json');return {...defaults,...(fs.existsSync(p)?validateUI(JSON.parse(fs.readFileSync(p,'utf8'))):{})};}
 writeUI(changes){const next={...this.readUI(),...validateUI(changes)},p=confined(this.workspace,'ui.json'),b=confined(this.workspace,'ui-backup.json');fs.mkdirSync(this.workspace,{recursive:true});fs.writeFileSync(b,JSON.stringify(this.readUI()),'utf8');fs.writeFileSync(p,JSON.stringify(next),'utf8');return {summary:'界面配置已保存并立即生效',settings:next};}
 rollbackUI(){const b=confined(this.workspace,'ui-backup.json');if(!fs.existsSync(b))throw Error('没有可回退的界面版本');const next=validateUI(JSON.parse(fs.readFileSync(b,'utf8')));return this.writeUI(next);}
 files(){const found=[];for(const dir of ['electron','src']){const base=path.join(this.sourceRoot,dir);if(!fs.existsSync(base))continue;for(const name of fs.readdirSync(base)){if(/\.(cjs|tsx|ts|css)$/.test(name))found.push(dir+'/'+name);}}return found;}
 read(file,offset=0){if(!this.files().includes(file))throw Error('只允许读取软件源文件');const p=path.join(this.sourceRoot,...file.split('/'));const text=fs.readFileSync(p,'utf8');return {file,hash:crypto.createHash('sha256').update(text).digest('hex'),text:text.slice(offset,offset+12000),offset,nextOffset:offset+12000<text.length?offset+12000:null,total:text.length};}
 stage({file,hash,before,after}){
  this.read(file);const source=fs.readFileSync(path.join(this.sourceRoot,...file.split('/')),'utf8');if(crypto.createHash('sha256').update(source).digest('hex')!==hash)throw Error('源文件已经变化，请重新读取');
  if(!before||source.split(before).length!==2)throw Error('替换片段必须在源文件中唯一匹配');
  const proposed=source.replace(before,()=>after);if(proposed.length>500000)throw Error('候选文件过大');
  const id=crypto.randomUUID(),folder=confined(this.workspace,'changes/'+id+'/record.json');fs.mkdirSync(path.dirname(folder),{recursive:true});
  const record={id,file,hash,before,after,at:Date.now(),status:'staged',note:'候选补丁尚未应用，不会执行代码'};
  fs.writeFileSync(folder,JSON.stringify(record,null,2),'utf8');fs.writeFileSync(confined(this.workspace,'changes/'+id+'/original.txt'),source,'utf8');fs.writeFileSync(confined(this.workspace,'changes/'+id+'/candidate.txt'),proposed,'utf8');
  return {summary:'候选补丁已保存，原文件已备份；尚未应用',patchId:id,file};
 }
 changes(){const folder=confined(this.workspace,'changes');if(!fs.existsSync(folder))return [];return fs.readdirSync(folder).filter(n=>/^[0-9a-f-]{36}$/.test(n)).slice(-30).map(n=>{const r=JSON.parse(fs.readFileSync(confined(this.workspace,'changes/'+n+'/record.json'),'utf8'));return {id:r.id,file:r.file,at:r.at,status:r.status,check:r.check};});}
 check(id){
  if(!/^[0-9a-f-]{36}$/.test(id))throw Error('补丁ID无效');const base='changes/'+id+'/',p=confined(this.workspace,base+'record.json'),r=JSON.parse(fs.readFileSync(p,'utf8')),candidate=fs.readFileSync(confined(this.workspace,base+'candidate.txt'),'utf8');
  const issues=[];if(this.read(r.file).hash!==r.hash)issues.push('源文件已变化，补丁过期');
  if(/\.(cjs|js)$/.test(r.file)){try{new (require('node:vm').Script)(candidate,{filename:r.file});}catch(e){issues.push('语法检查：'+e.message);}}
  else issues.push('此文件类型尚未配置编译检查');
  if(/child_process|execSync|spawn\(|shell\.openExternal|nodeIntegration\s*:\s*true|sandbox\s*:\s*false|clearStorageData|unlinkSync|rmSync|rmdirSync|credentials/i.test(r.after))issues.push('涉及进程、凭证、安全边界或删除操作，需要开发检查');
  r.status=issues.length?'needs-review':'syntax-checked';r.check={issues,syntaxOnly:true,runtimeTested:false,applied:false};fs.writeFileSync(p,JSON.stringify(r,null,2),'utf8');
  return {summary:issues.length?'补丁存在待检查项，未应用':'语法检查通过；未运行、未应用',file:r.file,patchId:id,...r.check,diff:{before:r.before,after:r.after}};
 }
}
module.exports={Customizer,validateUI,defaults,confined};
