const test=require('node:test'),assert=require('node:assert/strict');
const {Weixin,trustedBase,textMessage}=require('../electron/weixin.cjs');
test('微信只处理绑定用户的完整文本，不回复陌生人或机器人',()=>{
 const m={from_user_id:'owner',message_type:1,message_state:2,context_token:'ctx',item_list:[{type:1,text_item:{text:'现在投不投'}}]};
 assert.equal(textMessage(m,'owner'),'现在投不投');assert.equal(textMessage(m,'other'),null);assert.equal(textMessage({...m,message_type:2},'owner'),null);assert.equal(textMessage({...m,message_state:1},'owner'),null);
});
test('微信登录重定向不能把凭证发送给其他域名',()=>{
 assert.equal(trustedBase('https://ilinkai.weixin.qq.com/'),'https://ilinkai.weixin.qq.com');
 for(const u of ['http://ilinkai.weixin.qq.com','https://evil.org','https://ilinkai.weixin.qq.com.evil.org','https://ilinkai.weixin.qq.com/path'])assert.throws(()=>trustedBase(u));
});
test('微信去重、调用统一回复并发送到原发送者，断开后停止',async()=>{
 const values={weixinCredentials:'encrypted'},sent=[];let calls=0;let wx;
 const msg={message_id:1,from_user_id:'owner',message_type:1,message_state:2,context_token:'context',item_list:[{type:1,text_item:{text:'问问题'}}]};
 wx=new Weixin({store:{get:(k,d)=>values[k]??d,set:(k,v)=>values[k]=v},seal:x=>x,unseal:x=>x,emit:()=>{},reply:async()=>{calls++;return '建议';},fetcher:async(url,options)=>{
  if(url.endsWith('getupdates'))return {ok:true,json:async()=>({msgs:[msg,msg,{...msg,from_user_id:'other'}],get_updates_buf:'next'})};
  sent.push(JSON.parse(options.body));wx.epoch++;return {ok:true,json:async()=>({ret:0})};
 }});wx.account={owner:'owner',base:'https://ilinkai.weixin.qq.com',token:'secret'};await wx.poll(0);
 assert.equal(calls,1);assert.equal(sent.length,1);assert.equal(sent[0].msg.to_user_id,'owner');assert.equal(sent[0].msg.context_token,'context');wx.disconnect();assert.equal(values.weixinCredentials,null);
});

test('主动提醒只发绑定本人，沿用会话令牌，失败不报告已送达',async()=>{const sent=[];let fail=false;const wx=new Weixin({store:{get:(_k,d)=>d,set:()=>{}},seal:x=>x,unseal:x=>x,emit:()=>{},fetcher:async(u,o)=>{sent.push(JSON.parse(o.body));return {ok:true,json:async()=>({ret:fail?-2:0})};}});await assert.rejects(wx.sendAlert('test'),/未连接/);wx.account={owner:'self',base:'https://ilinkai.weixin.qq.com',token:'test'};await assert.rejects(wx.sendAlert('test'),/发一条消息/);wx.contextToken='context';const r=await wx.sendAlert('达到阈值','stable-id');assert.equal(r.accepted,true);assert.equal(sent[0].msg.to_user_id,'self');assert.equal(sent[0].msg.context_token,'context');assert.equal(sent[0].msg.client_id,'stable-id');fail=true;await assert.rejects(wx.sendAlert('test'),/刷新会话/);wx.disconnect();assert.equal(wx.public().alertReady,false);});
