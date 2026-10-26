const fs=require('node:fs'),crypto=require('node:crypto');
const {safeDir,checked,atomic}=require('./hermes-skills.cjs'),{excerpt}=require('./context-budget.cjs');
// Immutable originals, isolated by shop and conversation. No model call to summarize.
class Evidence{
 constructor(root){this.root=safeDir(root);}
 file(id){if(!/^[a-f0-9]{64}$/.test(id))throw Error('资料编号无效');return checked(this.root,id+'.json');}
 put(content,kind){const id=crypto.createHash('sha256').update(content).digest('hex'),file=this.file(id);if(!fs.existsSync(file))atomic(file,JSON.stringify({content,kind,at:Date.now()}));return id;}
 packet(content,kind,query='',limit=3200){const id=this.put(content,kind);let value;try{value=JSON.parse(content);}catch{}
  const source={};for(const k of ['url','title','checkedAt','publicationDate'])if(typeof value?.[k]==='string')source[k]=value[k].slice(0,k==='url'?1200:200);
  const details=value?.products||value?.priceEvidence?excerpt(JSON.stringify({products:value.products,priceEvidence:value.priceEvidence}),1200,query):undefined;
  return {localEvidence:id,kind,characters:content.length,...source,excerpt:excerpt(typeof value?.text==='string'?value.text:content,limit,query),detailsExcerpt:details,partial:true,note:'这里只是原文相关节选，不代表完整资料。原文已保存在本机；需核对遗漏信息时调用lm_evidence_read，按query查找或按offset分段读取。不要把节选未出现的信息当作原文没有。'};
 }
 history(messages,query){const names=new Map();return messages.map(m=>{for(const t of m.tool_calls||[])names.set(t.id,t.function?.name||'工具结果');const kind=names.get(m.tool_call_id);if(m.role!=='tool'||!['lm_web_read','lm_web_search','lm_evidence_read'].includes(kind)||typeof m.content!=='string'||m.content.length<=2400)return m;try{if(JSON.parse(m.content)?.localEvidence)return m;}catch{}return {...m,content:JSON.stringify(this.packet(m.content,kind,query,1000))};});}
 tool(value,kind,query){const content=JSON.stringify(value);return content.length>6000?this.packet(content,kind,query):value;}
 read({id,offset=0,query=''}){const file=this.file(id);if(!fs.existsSync(file))throw Error('本会话没有该资料，请使用当前工具结果中的编号');const {content,kind}=JSON.parse(fs.readFileSync(file,'utf8'));if(!Number.isInteger(offset)||offset<0||offset>content.length)throw Error('offset超出原文范围');
  if(query){if(typeof query!=='string'||query.length>200)throw Error('查询词最多200字');const found=content.toLowerCase().indexOf(query.toLowerCase(),offset);if(found<0)return {id,kind,characters:content.length,found:false,note:'本次查询词没有匹配。可换短词，或不传query按offset读取原文。'};offset=Math.max(offset,found-500);}
  const end=Math.min(content.length,offset+6000);return {id,kind,offset,nextOffset:end<content.length?end:null,characters:content.length,text:content.slice(offset,end),partial:offset>0||end<content.length,note:'本地保存的原文片段，未重新联网；日期和价格可能已变化。'};
 }
}
module.exports={Evidence};
