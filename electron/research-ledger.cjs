// Counts actual returned bodies, never search snippets or a model's claims.
const {excerpt}=require('./context-budget.cjs');
class ResearchLedger{
 constructor(requested=0){this.requested=requested;this.pages=new Map();this.failures=[];this.attempts=0;}
 add(tool,result){
  if(!['web_search','web_read','research_learn','learn'].includes(tool))return;
  this.attempts++;
  if(typeof result==='string'){this.failures.push(result.slice(0,500));return;}
  for(const p of result?.pages||result?.readPages||(tool==='web_read'?[result]:[])){
   if(!p?.url||typeof p.text!=='string'||p.text.trim().length<180)continue;
   let key;try{const u=new URL(p.url);u.hash='';key=u.href;}catch{continue;}
   if(this.pages.size<20||this.pages.has(key))this.pages.set(key,{url:key,title:String(p.title||key).slice(0,200),text:excerpt(p.text,900),checkedAt:p.checkedAt});
  }
  for(const e of result?.errors||[])this.failures.push(String(e.reason||e).slice(0,500));
  this.failures=this.failures.slice(-5);
 }
 view(){return {requestedArticles:this.requested,readCount:this.pages.size,attempts:this.attempts,sources:[...this.pages.values()],failures:this.failures};}
 receipt(){if(!this.attempts&&!this.requested)return '';const n=this.pages.size;return '\n\n本次读取：'+n+(this.requested?' / '+this.requested:'')+' 个网页正文'+(this.requested&&n<this.requested?'（尚未完成目标数量）':'')+'。'+(n?'\n'+[...this.pages.values()].map(p=>p.url).join('\n'):'\n'+(this.failures.at(-1)||'本次没有取得可读取的正文。'));}
}
module.exports={ResearchLedger};
