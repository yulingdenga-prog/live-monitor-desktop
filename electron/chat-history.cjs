function isClearRequest(text){
 return /^(?:请|帮我)?(?:清空|清理|清除)(?:当前|这个)?(?:对话框|聊天记录|对话记录|当前对话|聊天|对话)(?:[，,。\s]*(?:对话框记录太长了|记录太长了|太长了))?[。！!\s]*$/.test(String(text).trim());
}
function clear(store,scope){
 const count=store.rows('SELECT COUNT(*) AS n FROM messages WHERE scope=?',[scope])[0].n;
 store.db.run('BEGIN');
 try{
  store.db.run("DELETE FROM kv WHERE key IN (SELECT 'chatImages:' || id FROM messages WHERE scope=?)",[scope]);
  store.db.run('DELETE FROM messages WHERE scope=?',[scope]);
  store.db.run('DELETE FROM kv WHERE key=?',['researchTask:'+scope]);
  if(store.get('workContinuity')?.scope===scope)store.db.run("DELETE FROM kv WHERE key='workContinuity'");
  store.db.run('COMMIT');
 }catch(e){store.db.run('ROLLBACK');throw e;}
 store.flush();return {cleared:true,count,text:'当前对话已清空，经营记忆和采集资料已保留。',sources:[]};
}
module.exports={isClearRequest,clear};
