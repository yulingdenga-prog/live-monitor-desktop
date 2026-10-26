// iLink protocol interoperable with @tencent-weixin/openclaw-weixin 2.4.10.
// Text replies only, exclusively to the identity returned by QR confirmation.
const crypto=require('node:crypto');
const BASE='https://ilinkai.weixin.qq.com';
function trustedBase(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='ilinkai.weixin.qq.com'||u.hostname.endsWith('.ilinkai.weixin.qq.com'))||u.pathname!=='/'||u.search||u.hash)throw Error('微信返回的服务地址不受支持');return u.origin;}
function textMessage(m,owner){if(!owner||m.from_user_id!==owner||m.message_type!==1||m.message_state===1||!m.context_token)return null;const text=(m.item_list||[]).filter(x=>x.type===1).map(x=>x.text_item?.text||'').join('\n').trim();return text&&text.length<=4000?text:null;}
class Weixin{
 constructor({store,seal,unseal,reply,emit,fetcher=fetch,qr}){Object.assign(this,{store,seal,unseal,reply,emit,fetcher,qr});this.epoch=0;this.status='未连接';this.image='';this.lastReply=0;this.controllers=new Set();}
 public(){return {status:this.status,qr:this.image,connected:!!this.account,lastReply:this.lastReply,alertReady:!!(this.account&&this.contextToken),lastInbound:this.lastInbound||0};}
 notify(s){this.status=s;this.emit({type:'state'});}
 async call(base,endpoint,body,token,timeout=35000){
  const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),timeout);
  try{const headers={'Content-Type':'application/json','iLink-App-Id':'bot','iLink-App-ClientVersion':String((2<<16)|(4<<8)|10),'AuthorizationType':'ilink_bot_token','X-WECHAT-UIN':Buffer.from(String(crypto.randomBytes(4).readUInt32BE())).toString('base64')};if(token)headers.Authorization='Bearer '+token;
   const r=await this.fetcher(trustedBase(base)+'/ilink/bot/'+endpoint,{method:body?'POST':'GET',headers,body:body?JSON.stringify({...body,base_info:{channel_version:'2.4.10',bot_agent:'LiveMonitor/0.2.1'}}):undefined,signal:controller.signal,redirect:'error'});
   if(!r.ok)throw Error('微信接口HTTP '+r.status);const result=await r.json();if(result.ret||result.errcode)throw Error('微信接口错误 '+(result.errcode||result.ret));return result;
  }finally{clearTimeout(timer);this.controllers.delete(controller);}
 }
 stop(){this.epoch++;for(const c of this.controllers)c.abort();this.controllers.clear();this.account=null;this.contextToken='';this.lastInbound=0;this.image='';}
 disconnect(){this.stop();this.store.set('weixinCredentials',null);this.store.set('weixinAlertContext',null);this.store.set('weixinCursor','');this.store.set('weixinSeen',[]);this.notify('已断开');}
 async restore(){const saved=this.store.get('weixinCredentials',null);if(!saved)return;try{const account=JSON.parse(this.unseal(saved));trustedBase(account.base);if(!account.owner||!account.token)throw Error();this.account=account;try{const savedContext=this.store.get('weixinAlertContext',null);const c=savedContext?JSON.parse(this.unseal(savedContext)):null;if(c?.owner===account.owner){this.contextToken=c.token;this.lastInbound=c.at;}}catch{}this.notify('正在恢复微信连接');void this.poll(this.epoch);}catch{this.notify('微信登录已失效，请重新扫码');}}
 async login(){
  this.stop();const epoch=this.epoch;this.notify('正在获取微信二维码');
  try{const r=await this.call(BASE,'get_bot_qrcode?bot_type=3',{local_token_list:[]});if(epoch!==this.epoch)return;
   if(typeof r.qrcode!=='string'||typeof r.qrcode_img_content!=='string')throw Error('微信未返回有效二维码');
   this.image=await this.qr(r.qrcode_img_content);this.notify('请用微信扫码并确认');void this.waitLogin(epoch,r.qrcode);
  }catch(e){this.notify(e.message);throw e;}
 }
 async waitLogin(epoch,code){let base=BASE;const deadline=Date.now()+240000;
  while(epoch===this.epoch&&Date.now()<deadline){try{
   const r=await this.call(base,'get_qrcode_status?qrcode='+encodeURIComponent(code));if(epoch!==this.epoch)return;
   if(r.status==='confirmed'){
    if(!r.bot_token||!r.ilink_user_id)throw Error('登录缺少用户标识，未开启消息接收');
    const account={token:r.bot_token,owner:r.ilink_user_id,base:trustedBase(r.baseurl||BASE)};
    this.store.set('weixinCredentials',this.seal(JSON.stringify(account)));this.store.set('weixinCursor','');this.store.set('weixinSeen',[]);this.account=account;this.image='';this.notify('已连接，等待你的微信消息');void this.poll(epoch);return;
   }
   if(r.status==='scaned_but_redirect'){base=trustedBase('https://'+r.redirect_host);continue;}
   if(r.status==='expired'){this.image='';this.notify('二维码已过期，请重新扫码');return;}
   if(['need_verifycode','verify_code_blocked','binded_redirect'].includes(r.status)){this.image='';this.notify('微信要求额外验证，请在手机完成后重新扫码');return;}
   this.notify(r.status==='scaned'?'已扫码，请在微信确认':'等待微信扫码');
  }catch(e){if(epoch!==this.epoch)return;this.notify('连接微信暂时失败，正在重试');}
  await new Promise(r=>setTimeout(r,1500));
  }if(epoch===this.epoch){this.image='';this.notify('扫码超时，请重新连接');}
 }
 async sendAlert(text,clientId=crypto.randomUUID()){
  const a=this.account,epoch=this.epoch;
  if(!a)throw Error('微信未连接，请在设置中扫码连接');
  if(!this.contextToken)throw Error('请先在微信给机器人发一条消息，建立提醒会话');
  try{await this.call(a.base,'sendmessage',{msg:{from_user_id:'',to_user_id:a.owner,client_id:clientId,message_type:2,message_state:2,context_token:this.contextToken,item_list:[{type:1,text_item:{text:String(text).slice(0,3500)}}]}},a.token,15000);}
  catch(e){if(/-2|-14|401|403/.test(e.message))throw Error(e.message+'；请在微信给机器人发消息刷新会话，必要时重新扫码');throw e;}
  if(epoch!==this.epoch)throw Error('发送期间微信连接改变，请在手机确认接收情况');
  this.lastReply=Date.now();return {accepted:true,note:'接口已接受，不代表手机已读'};
 }
 async poll(epoch){
  while(epoch===this.epoch&&this.account){try{
   const a=this.account;const r=await this.call(a.base,'getupdates',{get_updates_buf:this.store.get('weixinCursor','')},a.token);if(epoch!==this.epoch)return;
   for(const m of (r.msgs||[]).slice(0,30)){
    const text=textMessage(m,a.owner);if(!text)continue;this.contextToken=m.context_token;this.lastInbound=Date.now();this.store.set('weixinAlertContext',this.seal(JSON.stringify({owner:a.owner,token:m.context_token,at:this.lastInbound}))); 
    const id=String(m.message_id||m.client_id||crypto.createHash('sha256').update(JSON.stringify(m)).digest('hex'));const seen=this.store.get('weixinSeen',[]);if(seen.includes(id))continue;
    // Persist before invocation: replay must never repeat an Agent action.
    this.store.set('weixinSeen',[...seen,id].slice(-500));this.notify('正在回复微信消息');
    let answer;try{answer=await this.reply(text);}catch{answer='本次处理未完成，请在直播监测设置中查看模型连接，稍后重试。';}
    if(epoch!==this.epoch)return;
    await this.call(a.base,'sendmessage',{msg:{from_user_id:'',to_user_id:a.owner,client_id:crypto.randomUUID(),message_type:2,message_state:2,context_token:m.context_token,item_list:[{type:1,text_item:{text:String(answer).slice(0,3500)}}]}},a.token,15000);this.lastReply=Date.now();
   }
   if(r.get_updates_buf)this.store.set('weixinCursor',r.get_updates_buf);this.notify('已连接，等待你的微信消息');
   await new Promise(r=>setTimeout(r,1000));
  }catch(e){if(epoch!==this.epoch)return;if(/-14|401|403/.test(e.message)){this.account=null;this.notify('微信凭证已失效，请重新扫码');return;}this.notify('微信连接或回复失败，稍后重试；未重复执行任务');await new Promise(r=>setTimeout(r,5000));}
  }
 }
}
module.exports={Weixin,trustedBase,textMessage};
