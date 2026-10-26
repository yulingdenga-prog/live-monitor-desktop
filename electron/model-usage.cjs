const number=(...values)=>values.find(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)??null;
function normalize(u){if(!u||typeof u!=='object')return null;
 const d=u.input_tokens_details||u.prompt_tokens_details||{};
 const input=number(u.input_tokens,u.prompt_tokens),output=number(u.output_tokens,u.completion_tokens);
 const creation=number(u.cache_creation_input_tokens,d.cache_creation_tokens,d.cache_write_tokens,u.cache_creation_tokens);
 const read=number(u.cache_read_input_tokens,d.cached_tokens,u.prompt_cache_hit_tokens,u.cached_tokens);
 // Split top-level Anthropic counts exclude cached input; OpenAI details are subsets.
 const split=u.prompt_tokens===undefined&&u.input_tokens!==undefined&&(u.cache_creation_input_tokens!==undefined||u.cache_read_input_tokens!==undefined);
 const allInput=input===null?null:input+(split?(creation||0)+(read||0):0);
 return {inputTokens:allInput,outputTokens:output,totalTokens:number(u.total_tokens,allInput!==null&&output!==null?allInput+output:null),cachedInputTokens:read,cacheReadTokens:read,cacheCreationTokens:creation};}
function record(store,{usage,messages,functions,id,model,elapsedMs,ok,kind,background=false,taskRequest,taskKey}){try{
 const inputParts={system:0,user:0,assistant:0,tool:0,other:0,schemas:functions?.length?JSON.stringify(functions).length:0};
 for(const m of messages){const part=m.type==='function_call_output'?'tool':m.type==='function_call'?'assistant':Object.hasOwn(inputParts,m.role)?m.role:'other';inputParts[part]+=(typeof m.content==='string'?m.content.length:Array.isArray(m.content)?m.content.reduce((a,p)=>a+(typeof p.text==='string'?p.text.length:0),0):0)+(typeof m.output==='string'?m.output.length:0)+(typeof m.arguments==='string'?m.arguments.length:0)+(m.tool_calls?JSON.stringify(m.tool_calls).length:0)+(typeof m.reasoning_content==='string'?m.reasoning_content.length:0);}
 const textChars=Object.values(inputParts).reduce((a,b)=>a+b,0);
 const imageCount=messages.reduce((n,m)=>n+(Array.isArray(m.content)?m.content.filter(p=>['input_image','image_url'].includes(p.type)).length:0),0);
 const row={at:Date.now(),kind:kind||(/report/.test(id)?'复盘日报':/knowledge/.test(id)?'知识研究':/verify/.test(id)?'连接验证':'对话或分析'),background,taskRequest,taskKey,model,textChars,inputParts,messageCount:messages.length,imageCount,elapsedMs,ok,usage:normalize(usage)};
 store.set('modelUsage',[...store.get('modelUsage',[]),row].slice(-100));
 if(taskKey){const tasks=store.get('modelTasks',[]),task=tasks.find(t=>t.taskKey===taskKey)||{taskKey,at:row.at,kind:row.kind,requests:0,failed:0,usage:{},missing:{}};
  task.updatedAt=row.at;task.requests++;task.failed+=Number(!ok);task.maxInputChars=Math.max(task.maxInputChars||0,textChars);
  for(const key of ['totalTokens','inputTokens','outputTokens','cacheCreationTokens','cacheReadTokens']){const n=row.usage?.[key];if(n==null)task.missing[key]=(task.missing[key]||0)+1;else task.usage[key]=(task.usage[key]||0)+n;}
  store.set('modelTasks',[...tasks.filter(t=>t.taskKey!==taskKey),task].slice(-50));
 }
 }catch{/* Logging must not fail successful answers. */}}
module.exports={normalize,record};
