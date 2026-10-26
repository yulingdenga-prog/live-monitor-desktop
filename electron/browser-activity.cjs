// No URL, header, cookie, body, host or referrer is retained.
const SCOPES=new Set(['merchant','publicSearch','publicReader']);
const TYPES=new Set(['mainFrame','subFrame','stylesheet','script','image','font','object','xhr','ping','cspReport','media','webSocket','other']);
const ERRORS=new Set(['net::ERR_ABORTED','net::ERR_FAILED','net::ERR_TIMED_OUT','net::ERR_NAME_NOT_RESOLVED','net::ERR_DNS_TIMED_OUT','net::ERR_INTERNET_DISCONNECTED','net::ERR_NETWORK_CHANGED','net::ERR_CONNECTION_RESET','net::ERR_CONNECTION_CLOSED','net::ERR_CONNECTION_REFUSED','net::ERR_CONNECTION_TIMED_OUT','net::ERR_PROXY_CONNECTION_FAILED','net::ERR_TUNNEL_CONNECTION_FAILED','net::ERR_CERT_AUTHORITY_INVALID','net::ERR_CERT_DATE_INVALID','net::ERR_SSL_PROTOCOL_ERROR','net::ERR_BLOCKED_BY_CLIENT','net::ERR_BLOCKED_BY_RESPONSE','net::ERR_INSUFFICIENT_RESOURCES','net::ERR_OUT_OF_MEMORY']);
const number=x=>Number.isFinite(x)&&x>=0?x:null;
class Activity{
 constructor({now=Date.now}={}){this.now=now;this.buckets=[];this.active=new Map();this.recent=[];this.dropped=0;}
 bucket(){const minute=Math.floor(this.now()/60000);let b=this.buckets.at(-1);if(b?.minute!==minute){b={minute,attempted:0,blocked:0,completed:0,failed:0,types:{},errors:{},statusClasses:{},timedRequests:0,totalDurationMs:0,maxDurationMs:0,slowHeaders:0,cacheResponses:0,declaredBytes:0,lengthKnownResponses:0};this.buckets.push(b);}this.buckets=this.buckets.filter(x=>minute-x.minute<30).slice(-30);return b;}
 start(d={}){const b=this.bucket(),type=TYPES.has(d.resourceType)?d.resourceType:'other';b.attempted++;b.types[type]=(b.types[type]||0)+1;if(number(d.id)!==null){if(!this.active.has(d.id)&&this.active.size>=2000){this.active.delete(this.active.keys().next().value);this.dropped++;}const old=this.active.get(d.id);this.active.set(d.id,{at:old?.at??this.now(),type,webContentsId:number(d.webContentsId)});}}
 allow(d={},cancel){const r=this.active.get(d.id);if(r){r.allowedAt=this.now();r.policyWaitMs=r.allowedAt-r.at;r.blocked=!!cancel;}if(cancel)this.bucket().blocked++;}
 headers(d={}){const r=this.active.get(d.id);if(r){r.headersAt=this.now();r.fromCache=!!d.fromCache;r.status=number(d.statusCode);const h=d.responseHeaders||{},k=Object.keys(h).find(x=>x.toLowerCase()==='content-length'),raw=k&&h[k]?.[0];if(typeof raw==='string'&&/^\d{1,10}$/.test(raw)){const n=Number(raw);if(n<=5e9)r.declaredBytes=n;}}}
 finish(d={},failed=false){const b=this.bucket();b[failed?'failed':'completed']++;const r=this.active.get(d.id);this.active.delete(d.id);const error=failed?(ERRORS.has(d.error)?d.error:'OTHER_NETWORK_ERROR'):undefined;if(error)b.errors[error]=(b.errors[error]||0)+1;
  if(!r)return;const ms=Math.max(0,this.now()-r.at),headersMs=r.headersAt!=null?Math.max(0,r.headersAt-(r.allowedAt??r.at)):null;
  b.timedRequests++;b.totalDurationMs+=ms;b.maxDurationMs=Math.max(b.maxDurationMs,ms);if(headersMs>=5000&&!r.fromCache)b.slowHeaders++;if(r.fromCache)b.cacheResponses++;
  const status=r.status??number(d.statusCode);if(status>=100&&status<=599){const group=Math.floor(status/100)+'xx';b.statusClasses[group]=(b.statusClasses[group]||0)+1;}
  if(r.declaredBytes!=null){b.declaredBytes+=r.declaredBytes;b.lengthKnownResponses++;}
  this.recent.push({at:this.now(),webContentsId:r.webContentsId,type:r.type,durationMs:ms,policyWaitMs:r.policyWaitMs??null,headersWaitMs:headersMs,fromCache:!!r.fromCache,blocked:!!r.blocked,status,error});if(this.recent.length>160)this.recent.shift();
 }
 snapshot(){this.bucket();return structuredClone(this.buckets);}
 details(){const now=this.now();return {minutes:this.snapshot(),inFlight:[...this.active.values()].slice(-100).map(r=>({webContentsId:r.webContentsId,type:r.type,ageMs:Math.max(0,now-r.at),stage:r.headersAt!=null?'receiving':r.allowedAt!=null?'waitingResponse':'localPolicyCheck',headersWaitMs:r.headersAt!=null?Math.max(0,r.headersAt-(r.allowedAt??r.at)):null})),trackedInFlight:this.active.size,recent:this.recent.filter(r=>now-r.at<1800000),droppedTracking:this.dropped,note:'请求阶段耗时含DNS、连接及服务端等待，不能单独判定网络拥堵；declaredBytes仅为响应头声明长度（可能缓存），不是实际带宽。网页长连接接收阶段可以长期存在。'};}
}
const scopes=new Map();
function install(session,canRequest=()=>true,{scope='merchant',check}={}){
 if(!SCOPES.has(scope))throw Error('Unknown diagnostic scope');const a=scopes.get(scope)||new Activity();scopes.set(scope,a);const filter={urls:['http://*/*','https://*/*']};
 session.webRequest.onBeforeRequest(filter,(d,done)=>{a.start(d);const finish=cancel=>{a.allow(d,cancel);done({cancel});};try{if(!canRequest())return finish(true);if(check)return Promise.resolve(check(d)).then(ok=>finish(!ok),()=>finish(true));finish(false);}catch{finish(true);}});
 session.webRequest.onResponseStarted?.(filter,d=>a.headers(d));session.webRequest.onCompleted(filter,d=>a.finish(d));session.webRequest.onErrorOccurred(filter,d=>a.finish(d,true));
 return {snapshot:()=>a.snapshot(),details:()=>a.details(),note:'仅记录商家页面的脱敏请求统计。'};
}
function snapshotAll(){return Object.fromEntries([...scopes].map(([k,v])=>[k,v.details()]));}
module.exports={install,snapshotAll,Activity,ERRORS,TYPES};
