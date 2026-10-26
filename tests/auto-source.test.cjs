const test=require('node:test'),assert=require('node:assert/strict');
const {autoSource}=require('../electron/domain.cjs');
const p={kind:'live',room:'7695208098163739442',exact:true,shopHint:'测试有限公司',status:'直播中'};
test('大屏自动识别场次店铺和实时属性',()=>{assert.equal(autoSource(p,'').source.scope,p.room);assert.equal(autoSource(p,p.shopHint).source.mode,'live');});
test('不同店铺或未知状态不自动并入',()=>{assert.equal(autoSource(p,'其他有限公司').source,undefined);assert.equal(autoSource({...p,status:''},'').source,undefined);});
test('已结束场次标为历史，不因在线零判下播',()=>{assert.equal(autoSource({...p,status:'直播结束'},'').source.mode,'historical');assert.equal(autoSource({...p,online:0},'').source.mode,'live');});
