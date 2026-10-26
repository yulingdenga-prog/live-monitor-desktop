const test=require('node:test'),assert=require('node:assert/strict');
const {crawl}=require('../electron/table-crawl.cjs');
function setup(options={}){let page=1,calls=[];const data=()=>({url:'https://compass.jinritemai.com/shop',shopHint:'店铺',dates:[],headings:['看商品'],interaction:0,page,last:page===4,rows:[[{label:'商品信息',raw:'商品'+(options.repeat?1:page)}]]});return {calls,initial:data(),read:async()=>({...data(),...(options.changed?{shopHint:'其他店铺'}:{})}),go:async(_,target)=>{calls.push(target);page=target;return true},allowed:()=>true,progress:()=>{},wait:async()=>{}};}
test('逐页稳定读取并恢复起始页，每页只合并一次',async()=>{const s=setup(),r=await crawl(s);assert.equal(r.complete,true);assert.equal(r.pages.length,4);assert.equal(r.rows.length,4);assert.deepEqual(s.calls,[2,3,4,1]);});
test('页码改变但仍返回旧行时停止，不伪报完整',async()=>{const r=await crawl(setup({repeat:true}));assert.equal(r.complete,false);assert.equal(r.pages.length,1);assert.match(r.reason,/未确认更新/);});
test('店铺改变停止，不继续翻页或恢复用户页面',async()=>{const s=setup({changed:true}),r=await crawl(s);assert.equal(r.complete,false);assert.deepEqual(s.calls,[2]);});
test('暂停后不点击分页',async()=>{const s=setup();s.allowed=()=>false;const r=await crawl(s);assert.equal(r.pages.length,0);assert.deepEqual(s.calls,[]);});
