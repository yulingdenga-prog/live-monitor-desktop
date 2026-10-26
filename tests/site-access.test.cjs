const test=require('node:test'),assert=require('node:assert/strict');const {publicOrigin}=require('../electron/site-access.cjs');const {allowedUrl}=require('../electron/data-navigation.cjs');
test('用户指定外部网站只扩展该来源，私网字面地址不开放',()=>{
 assert.equal(publicOrigin('https://example.com/report'),'https://example.com');for(const x of ['http://example.com','https://127.0.0.1','https://localhost','file:///C:/x'])assert.equal(publicOrigin(x),null);
 assert.equal(allowedUrl('https://example.com/report',['https://example.com']),true);assert.equal(allowedUrl('https://other.com/report',['https://example.com']),false);assert.equal(allowedUrl('https://example.com/report?op=delete',['https://example.com']),false);
});
