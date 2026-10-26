const test=require('node:test'),assert=require('node:assert/strict');
const {select,extract}=require('../electron/adaptive-reader.cjs');
const observed={url:'https://compass.jinritemai.com/shop',candidates:[{id:'0',key:'observed-key',label:'新指标',values:['12']}]};
test('新字段只能来自真实候选，拒绝虚构与重复ID',()=>{
 assert.throws(()=>select(observed,['fake']));assert.throws(()=>select(observed,['0','0']));
 assert.equal(select(observed,['0'])[0].label,'新指标');
});
test('二次试读及持续采集要求地址和结构匹配，数值取最新页面',()=>{
 const rule={url:observed.url,fields:select(observed,['0'])};
 assert.equal(extract(observed,rule)[0].values[0],'12');
 assert.throws(()=>extract({...observed,url:'https://compass.jinritemai.com/other'},rule));
 assert.throws(()=>extract({...observed,candidates:[]},rule));
 assert.throws(()=>extract({...observed,candidates:[...observed.candidates,...observed.candidates]},rule));
});
