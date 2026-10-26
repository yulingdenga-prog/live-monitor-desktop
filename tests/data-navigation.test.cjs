const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const N=require('../electron/data-navigation.cjs');
test('动态数据链接可发现新路径，但拒绝修改消费及伪造域名',()=>{
 for(const url of ['https://compass.jinritemai.com/product/analysis?id=1','https://qianchuan.jinritemai.com/report/detail?plan_id=1'])assert.equal(N.allowedUrl(url),true);
 for(const url of ['https://compass.jinritemai.com/product/edit?id=1','https://qianchuan.jinritemai.com/report?op=delete','https://compass.jinritemai.com/data?redirect=https://evil.org','https://compass.jinritemai.com.evil.org/report','https://compass.jinritemai.com/data?token=secret','javascript:alert(1)'])assert.equal(N.allowedUrl(url),false);
});
test('数据页签必须唯一且页面未切换，不能点击表单中的同名按钮',()=>{
 let clicks=0;const node={getClientRects:()=>[{}],innerText:'看商品',getAttribute:()=>null,closest:()=>null,querySelector:()=>null,click:()=>clicks++};
 const env={location:{href:'https://compass.jinritemai.com/shop'},getComputedStyle:()=>({visibility:'visible'}),document:{querySelectorAll:()=>[node]}};
 assert.equal(vm.runInNewContext(N.tabScript({page:env.location.href,label:'看商品'}),env),true);assert.equal(clicks,1);
 assert.equal(vm.runInNewContext(N.tabScript({page:env.location.href+'?changed',label:'看商品'}),env),false);
 env.document.querySelectorAll=()=>[node,node];assert.equal(vm.runInNewContext(N.tabScript({page:env.location.href,label:'看商品'}),env),false);assert.equal(clicks,1);
});
