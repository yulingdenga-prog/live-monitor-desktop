const test=require('node:test'),assert=require('node:assert/strict');
const {validate,content}=require('../electron/chat-images.cjs');
const image={name:'示例.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII='};
test('图片保留真实载荷，两种协议各自使用正确结构',()=>{
 const images=validate([image]);assert.equal(content('看图',images,'chat')[1].image_url.url,image.data);assert.equal(content('看图',images,'responses')[1].image_url,image.data);assert.equal(content('文字',[],'chat'),'文字');
});
test('拒绝伪装文件、远程地址、过量附件',()=>{
 for(const images of [[{data:'https://example.com/a.png'}],[{data:'data:image/png;base64,aGVsbG8='}],Array(5).fill(image),{}])assert.throws(()=>validate(images));
});

test('同一批重复图片只发送一次',()=>{assert.equal(validate([image,image]).length,1)});
