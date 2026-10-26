const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {script}=require('../electron/frame-reader.cjs');
test('场次时间只取平台开播时间，不用抓取日期补齐',()=>{
 const read=body=>vm.runInNewContext(script,{URL,location:new URL('https://qianchuan.jinritemai.com/board-next'),document:{title:'直播大屏',body:{innerText:body},querySelectorAll:()=>[],querySelector:()=>null}});
 assert.equal(read('开播时间：2026-10-11 08:58:36').sessionStartedAt,'2026-10-11T08:58:36+08:00');assert.equal(read('数据更新 2026-10-11 19:00:00').sessionStartedAt,null);
});
test('分页定位保留数字按钮容器，不选择共20条文本节点',()=>{
 const visible=()=>[{}],control={innerText:'1',className:'aurora-pagination-item-active',getAttribute:()=>null};
 const total={innerText:'共20条',className:'aurora-pagination-total-text',getClientRects:visible,querySelectorAll:()=>[],contains:()=>false};
 const pager={innerText:'共20条\n1\n2\n3\n4',className:'aurora-pagination',getClientRects:visible,querySelectorAll:()=>[control],contains:e=>e===total};
 const headers=[{innerText:'商品信息'},{innerText:'用户支付金额'}],row={querySelectorAll:()=>[{innerText:'商品甲'},{innerText:'¥20.00'}]};
 const parent={querySelectorAll:()=>[pager,total],parentElement:null};
 const table={getClientRects:visible,parentElement:parent,querySelectorAll:s=>s==='thead th,[role="columnheader"]'?headers:s==='thead'?[{}]:s==='tbody tr,[role="row"]'?[row]:[]};
 const r=vm.runInNewContext(script,{URL,location:new URL('https://compass.jinritemai.com/shop'),getComputedStyle:()=>({visibility:'visible'}),document:{title:'罗盘',querySelector:()=>null,querySelectorAll:s=>s==='table,[role="table"]'?[table]:s==='[class*="pagination"]'?[pager,total]:[]}});
 assert.equal(r.tables[0].pagination.className,'aurora-pagination');assert.equal(r.tables[0].pagination.controls.length,1);
});
test('内嵌大屏读取返回框架自身来源和指标，不依赖顶层地址',()=>{
 const labels=['综合成本(元)','净成交金额(元)','综合营销ROI','实时在线人数','整体成交订单数'];
 const cards=labels.map((label,i)=>({getClientRects:()=>[{}],querySelector:s=>({innerText:s==='.metric-name'?label:String(i+1)})}));
 const result=vm.runInNewContext(script,{URL,location:new URL('https://qianchuan.jinritemai.com/board-next?live_room_id=123'),getComputedStyle:()=>({visibility:'visible'}),document:{title:'直播大屏',querySelectorAll:s=>s==='.overview-metric-card'?cards:[],querySelector:()=>null}});
 assert.equal(result.url,'https://qianchuan.jinritemai.com/board-next');assert.equal(result.room,'123');assert.equal(result.metrics.length,5);assert.equal(result.exact,true);
});
test('空页面不伪造指标',()=>{
 const result=vm.runInNewContext(script,{URL,location:{href:'https://business.oceanengine.com/portal'},document:{title:'登录',querySelectorAll:()=>[],querySelector:()=>null}});
 assert.equal(result.metrics.length,0);assert.equal(result.exact,false);
});
test('候选指标不依赖类名，跳过环比占位和买家表格',()=>{
 function label(text,value,table=false){const parent={innerText:text+'\n'+value+'\n较上期\n-20%',tagName:'DIV',className:'generated_x9',parentElement:null};return {innerText:text,parentElement:parent,getClientRects:()=>[{}],closest:()=>table?{}:null};}
 const nodes=[label('成交金额','1,234.00'),label('访客数','—'),label('支付金额','200',true)];
 const r=vm.runInNewContext(script,{URL,location:new URL('https://compass.jinritemai.com/shop'),getComputedStyle:()=>({visibility:'visible'}),document:{title:'罗盘',readyState:'complete',querySelectorAll:s=>s==='span,div,p,dt,label'?nodes:[],querySelector:()=>null}});
 assert.equal(r.metrics.length,1);assert.equal(r.metrics[0].raw,'1,234.00');assert.equal(r.exact,false);assert.ok(r.diagnostics.labelStructures.length>0);
});
test('金额整数和小数分行时完整读取，不混入环比',()=>{
 const parent={innerText:'整体消耗\n786\n.40\n-1.32%',tagName:'DIV',className:'aurora-qc-statistic',parentElement:null};const label={innerText:'整体消耗',parentElement:parent,getClientRects:()=>[{}],closest:()=>null};
 const r=vm.runInNewContext(script,{URL,location:new URL('https://qianchuan.jinritemai.com/overall-prom'),getComputedStyle:()=>({visibility:'visible'}),document:{title:'投放管理',querySelectorAll:s=>s==='span,div,p,dt,label'?[label]:[],querySelector:()=>null}});assert.equal(r.metrics[0].raw,'786.40');
});
