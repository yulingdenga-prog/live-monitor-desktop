const test=require('node:test'),assert=require('node:assert/strict');
const {productState,goScript}=require('../electron/product-pager.cjs');
const sample=()=>({url:'https://compass.jinritemai.com/shop',shopHint:'店铺',dates:[],headings:['看商品'],tables:[{headers:['商品信息','用户支付金额'],rows:[[{label:'商品信息',raw:'商品甲'}]],pagination:{index:0,text:'共20条 1 2 3 4',controls:[{text:'1',className:'pagination-item-active'},{text:'2',className:'pagination-item'},{text:'3',className:'pagination-item'},{text:'4',className:'pagination-item'},{text:'',className:'pagination-next'}]}}]});
test('分页必须具备商品字段、店铺、唯一当前页与明确下一页控件',()=>{const p=sample();assert.equal(productState(p).page,1);assert.equal(productState(p).total,20);p.tables[0].pagination.controls.pop();assert.equal(productState(p),null);});
test('非罗盘页面与重复商品表格均不触发点击',()=>{const p=sample();p.url='https://qianchuan.jinritemai.com/shop';assert.equal(productState(p),null);p.url='https://compass.jinritemai.com/shop';p.tables.push(p.tables[0]);assert.equal(productState(p),null);});
test('生成的点击脚本语法有效且仅使用数字分页控件',()=>{const s=goScript(productState(sample()),2);assert.doesNotThrow(()=>new Function(s));assert.match(s,/controls.length!==1/);});
