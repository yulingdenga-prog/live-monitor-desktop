const test=require('node:test'),assert=require('node:assert/strict');
const {install}=require('../electron/browser-activity.cjs');
test('后台全部暂停时阻止会话继续请求，恢复后放行；诊断只保存聚合计数',()=>{
 const handlers={};const session={webRequest:Object.fromEntries(['onBeforeRequest','onCompleted','onErrorOccurred'].map(k=>[k,(_f,fn)=>handlers[k]=fn]))};let active=false;
 const a=install(session,()=>active);let cancel;handlers.onBeforeRequest({url:'https://fixture.invalid/private?token=secret',resourceType:'xhr'},r=>cancel=r.cancel);assert.equal(cancel,true);
 active=true;handlers.onBeforeRequest({url:'https://fixture.invalid/private',resourceType:'image'},r=>cancel=r.cancel);assert.equal(cancel,false);handlers.onCompleted();handlers.onErrorOccurred();
 const rows=a.snapshot();assert.equal(rows[0].attempted,2);assert.equal(rows[0].blocked,1);assert.equal(rows[0].completed,1);assert.equal(rows[0].failed,1);assert(!JSON.stringify(rows).includes('secret'));assert(!JSON.stringify(rows).includes('fixture.invalid'));rows[0].attempted=999;assert.equal(a.snapshot()[0].attempted,2);
});
