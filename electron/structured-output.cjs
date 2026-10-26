function parse(text){
 if(typeof text!=='string')throw Error('结构化响应为空');
 const raw=text.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
 try{return JSON.parse(raw);}catch{}
 // Accept one complete JSON value surrounded by prose, never execute text.
 for(let start=0;start<raw.length;start++){
  if(!'{['.includes(raw[start]))continue;
  const stack=[];let quoted=false,escape=false;
  for(let i=start;i<raw.length;i++){const c=raw[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}if(c==='"'){quoted=true;continue;}if(c==='{'||c==='[')stack.push(c);else if(c==='}'||c===']'){if(stack.pop()!==(c==='}'?'{':'['))break;if(!stack.length){try{return JSON.parse(raw.slice(start,i+1));}catch{break;}}}}
 }
 throw Error('模型回复没有包含有效的执行数据');
}
async function request(model,messages,{validate=x=>x,...opts}={}){
 let last;for(let attempt=0;attempt<2;attempt++){
  const input=attempt?[...messages,{role:'assistant',content:last.slice(0,4000)},{role:'user',content:'上一条格式不正确。不要解释，不执行新任务，只返回系统要求的JSON数据。'}]:messages;
  const r=await model.run(input,{...opts,json:true,direct:true});last=String(r.text||'');
  try{return validate(parse(last));}catch(e){if(attempt)throw Error('模型两次未返回有效的执行数据，本次操作未执行。');}
 }
}
module.exports={parse,request};
