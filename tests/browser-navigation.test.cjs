const test=require('node:test'),assert=require('node:assert/strict');const {browsable,popupAllowed,menuItems}=require('../electron/browser-navigation.cjs');
test('浏览器支持普通跨域网页和空白弹窗，仍拒绝本地及脚本协议',()=>{assert.ok(browsable('https://other.example/report'));assert.ok(browsable('http://example.com'));assert.ok(popupAllowed('about:blank'));for(const x of ['file:///C:/x','javascript:alert(1)','shell:startup'])assert.equal(popupAllowed(x),false);});
test('右键复制真实链接，打开动作独立，不把无链接按钮伪装为链接',()=>{const opened=[],copied=[];const deps={open:x=>opened.push(x),copy:x=>copied.push(x),reload(){},back(){},forward(){},canBack:false,canForward:false};const url='https://example.com/report?id=123';const items=menuItems({linkURL:url,pageURL:'https://example.com'},deps);items.find(x=>x.label==='复制链接地址').click();assert.deepEqual(copied,[url]);assert.equal(opened.length,0);items.find(x=>x.label==='在新标签页打开链接').click();assert.deepEqual(opened,[url]);assert.ok(!menuItems({linkURL:'',pageURL:'https://example.com'},deps).some(x=>x.label==='复制链接地址'));});

test('merchant UA retains real engine and OS and removes app tokens',()=>{
 const {merchantUserAgent}=require('../electron/browser-navigation.cjs');
 const chrome='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.130 Safari/537.36';
 assert.equal(merchantUserAgent(chrome.replace('Chrome/', '直播监测/0.3.2 Chrome/').replace(' Safari/', ' Electron/44.7.0 Safari/')),chrome);
 assert.equal(merchantUserAgent(chrome),chrome);
});
