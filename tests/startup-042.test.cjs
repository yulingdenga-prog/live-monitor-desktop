const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {StartupTabs}=require('../electron/startup-tabs.cjs'),Store=require('../electron/store.cjs'),{PreviewCache}=require('../electron/image-previews.cjs'),{related}=require('../electron/research.cjs');
test('恢复八个标签时串行加载，等待的标签不丢失且后台标签不抢前台',async()=>{
 const entries=Array.from({length:8},(_,i)=>({url:'https://example.com/'+i})),seen=[],pauses=[];let release;
 const q=new StartupTabs(entries,async(e,bg)=>{seen.push([e.url,bg]);await new Promise(r=>release=r)},{pause:async ms=>pauses.push(ms)});
 const work=q.start();assert.equal(seen.length,1);assert.equal(q.pending.length,7);
 for(let i=0;i<8;i++){release();await new Promise(r=>setImmediate(r));}
 await work;assert.equal(q.pending.length,0);assert.equal(pauses.length,7);assert.equal(seen[0][1],false);assert.ok(seen.slice(1).every(x=>x[1]));
});
test('退出时停止恢复，仍保留待恢复的网址',async()=>{let release;const q=new StartupTabs([{url:'a'},{url:'b'}],()=>new Promise(r=>release=r));const work=q.start();q.stop();release();await work;assert.deepEqual(q.pending,[{url:'b'}]);});
test('日常启动不初始化仅用于旧数据库导入的WASM引擎',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'startup-db-'));const s=await new Store().init(dir);assert.equal(s.SQL,undefined);s.set('knowledge',['原有经验']);assert.deepEqual(s.get('knowledge'),['原有经验']);s.db.close();fs.rmSync(dir,{recursive:true,force:true});});
test('首次状态读取不阻塞解码历史图片，重复轮询不重复排队',async()=>{let renders=0;const c=new PreviewCache(x=>{renders++;return x});const load=()=>[{name:'图',data:'原图'}];assert.deepEqual(c.getDeferred(1,load),[]);assert.equal(renders,0);c.getDeferred(1,load);assert.equal(c.pending.size,1);await new Promise(r=>setTimeout(r,650));assert.equal(renders,1);assert.equal(c.getDeferred(1,load).length,1);});
test('无关搜索页面不计入主题学习资料',()=>{assert.equal(related({title:'食品科学与工程',text:'大学招生专业介绍'},'食品 直播 商品讲解 消费心理'),false);assert.equal(related({title:'直播商品讲解',text:'通过具体使用场景回应消费者疑虑'},'食品 直播 商品讲解 消费心理'),true);});
