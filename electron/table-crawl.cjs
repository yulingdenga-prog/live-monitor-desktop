// Bounded read-only paging. DOM adapters supply validated page controls.
async function crawl({initial,read,go,allowed,progress,wait=ms=>new Promise(r=>setTimeout(r,ms)),maxPages=20}){
 const scope=x=>JSON.stringify([x.url,x.shopHint,x.dates,x.headings,x.interaction,x.tablePeriod]);
 const expected=scope(initial), original=initial.page, pages=[], seen=new Set();
 let current=initial, reason='',complete=false;
 async function move(target){
  if(!allowed()||scope(current)!==expected)throw Error('页面范围改变或监测已暂停');
  if(!await go(current,target))throw Error('分页控件不匹配，已停止');
  let previous='';
  for(let i=0;i<12;i++){
   await wait(600);if(!allowed())throw Error('监测已暂停');
   const next=await read();if(!next||scope(next)!==expected)throw Error('用户操作或统计范围改变，已停止');
   const signature=JSON.stringify(next.rows);
   // Wait for two stable reads, and do not accept a changed page marker with old rows.
   if(next.page===target&&next.rows.length&&signature!==JSON.stringify(current.rows)&&signature===previous){current=next;return;}
   previous=signature;
  }
  throw Error('翻页后数据未确认更新，保留已采集页');
 }
 try{
  if(current.page!==1)await move(1);
  for(let i=0;i<maxPages;i++){
   if(!allowed())throw Error('监测已暂停');
   const signature=JSON.stringify(current.rows);if(seen.has(signature))throw Error('出现重复页，已停止');
   seen.add(signature);pages.push({page:current.page,at:Date.now(),rows:current.rows});progress(pages.length);
   if(current.last){complete=!initial.total||pages.reduce((n,p)=>n+p.rows.length,0)===initial.total;if(!complete)reason='已到末页，但采集行数与页面总数不符';break;}
   if(i+1===maxPages){reason='达到单次20页上限';break;}
   await move(current.page+1);
  }
 }catch(e){reason=e.message;}
 // Restore only if the user has not interacted and scope is still identical.
 try{const now=await read();if(allowed()&&now&&scope(now)===expected&&now.page!==original){current=now;await move(original);}}catch{}
 return {pages,rows:pages.flatMap(p=>p.rows),complete,reason:reason||'已到最后一页',coverage:`已采集${pages.length}页 / ${pages.reduce((n,p)=>n+p.rows.length,0)}行；${complete?'已到末页（采集期间数据可能变化）':reason}`};
}
module.exports={crawl};
