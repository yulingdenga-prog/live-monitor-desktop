const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Workspace,dataUrl,validate,Agent}=require('../electron/agent.cjs');
test('只允许明确适配的数据路由和查询参数',()=>{
 assert.ok(dataUrl('https://qianchuan.jinritemai.com/board-next?live_room_id=123'));
 for(const url of ['file:///C:/x','https://qianchuan.jinritemai.com/delete','https://qianchuan.jinritemai.com/overall-prom?action=delete','https://qianchuan.jinritemai.com.evil.org/board-next','https://user:pass@compass.jinritemai.com/shop'])assert.equal(dataUrl(url),null);
});
test('整个计划先验证，拒绝未知工具与模型虚构的URL',()=>{
 assert.throws(()=>validate({steps:[{tool:'collect',tabId:'1'},{tool:'shell',command:'del'}]},'采集',[{id:'1'}]));
 assert.throws(()=>validate({steps:[{tool:'open_data',url:'https://compass.jinritemai.com/shop'}]},'看看数据',[]));
 assert.throws(()=>validate({steps:[{tool:'remember'}]},'这场怎么样',[]));
});
test('工作区拒绝任意路径和目录联接，保留旧文件版本',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-test-'));const w=new Workspace(path.join(dir,'AgentWorkspace'));
 for(const name of ['../private.txt','C:\\private.txt','main.cjs','credentials.json'])assert.throws(()=>w.write(name,[]));
 w.write('requirements.json',[1]);w.write('requirements.json',[2]);assert.deepEqual(w.read('backups.json')[0].value,[1]);
 const linked=path.join(dir,'linked');fs.symlinkSync(w.root,linked,process.platform==='win32'?'junction':'dir');assert.throws(()=>new Workspace(linked).read('tasks.json'));
});
test('停止后规划结果不得执行任何动作',async()=>{
 const a=new Agent(fs.mkdtempSync(path.join(os.tmpdir(),'agent-stop-')),()=>{});let calls=0;
 const result=await a.run({id:'a',text:'采集',shop:'店铺',tabs:[{id:'1'}],model:{run:async()=>{a.cancel('a');return {text:'{"steps":[{"tool":"collect","tabId":"1"}]}'};}},execute:async()=>{calls++;}});
 assert.equal(calls,0);assert.match(result,/停止/);
});
test('Agent依据观察逐步进入新页面并保存字段，后续能看到新标签',async()=>{
 const a=new Agent(fs.mkdtempSync(path.join(os.tmpdir(),'agent-loop-')),()=>{});let round=0;const tabs=[{id:'1',title:'首页'}],actions=[];
 const result=await a.run({id:'a',text:'采集商品页面新字段',shop:'店铺',tabs:()=>tabs,model:{run:async(messages)=>{
  const input=JSON.parse(messages[1].content);const steps=[{tool:'inspect',tabId:'1'},{tool:'navigate',targetId:'observed-1'},{tool:'adapt',tabId:'2'}];
  if(round===2)assert.equal(input.tabs.length,2);
  if(round===4)return {text:'已采集新字段'};
  return {text:JSON.stringify({steps:round<3?[steps[round++]]:(round++,[])})};
 }},execute:async step=>{actions.push(step.tool);if(step.tool==='navigate')tabs.push({id:'2',title:'商品分析'});return {summary:'成功',data:{value:12}};}});
 assert.deepEqual(actions,['inspect','navigate','adapt']);assert.equal(result,'已采集新字段');
});

test('兼容真实模型action字段但仍拒绝危险动作',()=>{assert.deepEqual(validate({steps:[{action:'inspect',tabId:'1'}]},'采集',[{id:'1'}]),[{tool:'inspect',tabId:'1'}]);assert.throws(()=>validate({steps:[{action:'delete'}]},'采集',[]));});
