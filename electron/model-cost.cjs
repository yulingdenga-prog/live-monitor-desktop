// Host-owned limits apply before every upstream attempt, including retries.
const DEFAULT={backgroundEnabled:false,dailyRequests:100,taskRequests:24};
const {randomUUID}=require('node:crypto');
const day=(now=Date.now())=>new Date(now+8*3600000).toISOString().slice(0,10);
function blocked(message){const e=Error(message+'；可在「设置 → 任务用量」调整。');e.code='MODEL_BUDGET';return e;}
class CostControl{
 constructor(store){this.store=store;this.tasks=new Map();}
 config(){return {...DEFAULT,...this.store.get('modelCostPolicy',{}),backgroundEnabled:false};}
 daily(){const d=this.store.get('modelCostDaily',{});return d.day===day()?d:{day:day(),requests:0,backgroundRequests:0,kinds:{}};}
 public(){return {...this.config(),today:this.daily()};}
 save(input){const next=this.config();for(const [key,max]of [['dailyRequests',10000],['taskRequests',200]])if(input[key]!==undefined){const n=Number(input[key]);if(!Number.isInteger(n)||n<1||n>max)throw Error('调用上限必须是1至'+max+'的整数');next[key]=n;}this.store.set('modelCostPolicy',next);return this.public();}
 begin(id,meta={}){if(!id)throw Error('任务编号缺失');this.tasks.set(id,{...meta,count:0,taskKey:randomUUID()});if(this.tasks.size>500)this.tasks.delete(this.tasks.keys().next().value);}
 backgroundAllowed(){return false;}
 jobAllowed(job){return this.store.get('manualReport:'+job.id,false);}
 reserve(id){const c=this.config(),d=this.daily(),t=this.tasks.get(id)||{count:0,taskKey:randomUUID()};if(t.background&&!c.backgroundEnabled)throw blocked('后台AI已暂停，数据采集和阈值提醒仍继续');if(d.requests>=c.dailyRequests)throw blocked('今日AI请求已达到'+c.dailyRequests+'次上限，已停止发出新请求');if(t.count>=c.taskRequests)throw blocked('本轮任务已达到'+c.taskRequests+'次模型请求上限，已停止继续调用');t.count++;this.tasks.set(id,t);if(this.tasks.size>500)this.tasks.delete(this.tasks.keys().next().value);const kind=t.kind||(/verify/.test(id)?'连接验证':/auto:/.test(id)?'自动分析':/knowledge/.test(id)?'知识研究':/report/.test(id)?'复盘日报':'主动对话');d.requests++;if(t.background)d.backgroundRequests++;d.kinds[kind]=(d.kinds[kind]||0)+1;this.store.set('modelCostDaily',d);return {kind,background:!!t.background,taskRequest:t.count,taskKey:t.taskKey};}
}
module.exports={CostControl,DEFAULT,day};
