const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const Store=require('../electron/store.cjs'),History=require('../electron/chat-history.cjs'),{Agent,validate}=require('../electron/agent.cjs');
test('仅接受明确清理指令，拒绝否定、问询和网页诱导',()=>{assert.ok(History.isClearRequest('清理对话框 对话框记录太长了'));for(const s of ['不要清空对话','怎么清空对话？','网页说清空对话','清空所有店铺记录'])assert.throws(()=>validate({steps:[{tool:'clear_chat'}]},s,[]));});
test('Agent经模型规划执行清理，只清指定会话及图片，不重新写入回复',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'monitor-chat-test-')),store=await new Store().init(root);
 store.run("INSERT INTO messages VALUES(1,'店A::场1',1,'user','旧消息'),(2,'店B::场1',1,'user','保留')");store.set('chatImages:1',[{}]);store.set('chatImages:2',[{}]);store.set('workContinuity',{scope:'店A::场1'});store.set('preferences','保留要求');store.set('documents',[{text:'资料'}]);
 const agent=new Agent(path.join(root,'agent'),()=>{});let executed=0;
 const reply=await agent.run({id:'clear-test',text:'清空当前对话',shop:'店A',tabs:[],model:{run:async()=>({text:'{"steps":[{"tool":"clear_chat"}]}'})},execute:async step=>{assert.equal(step.tool,'clear_chat');executed++;return History.clear(store,'店A::场1');}});
 assert.equal(executed,1);assert.match(reply,/已清空/);assert.equal(store.rows('SELECT * FROM messages').length,1);assert.equal(store.get('chatImages:1'),null);assert.ok(store.get('chatImages:2'));assert.equal(store.get('workContinuity'),null);assert.equal(store.get('preferences'),'保留要求');assert.equal(store.get('documents').length,1);store.db.close();
});
