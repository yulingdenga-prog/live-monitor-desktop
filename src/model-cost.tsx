import {useEffect,useState} from 'react';
export function CostPanel({state:s,act}:{state:any,act:any}){
 const c=s.modelCost||{backgroundEnabled:false,dailyRequests:100,taskRequests:24,today:{requests:0,kinds:{}}};
 const [daily,D]=useState(c.dailyRequests),[task,T]=useState(c.taskRequests);
 useEffect(()=>{D(c.dailyRequests);T(c.taskRequests)},[c.dailyRequests,c.taskRequests]);
 const count=(n:any)=>n==null?'未返回':Number(n).toLocaleString('zh-CN');
 const sum=(t:any,key:string)=>t.usage?.[key]==null?'未返回':`${count(t.usage[key])}${t.missing?.[key]?'（部分请求未返回）':''}`;
 return <div className="panel cost-panel"><h2>任务用量</h2><p>采集和行动记录不调用AI。主动分析、学习、联网研究和报告按任务计入用量。</p>
 <p><strong>AI仅在你提出任务时调用</strong> · 今日已发出 {c.today.requests} / {c.dailyRequests} 次模型请求</p>
 <small>北京时间每日重计，从升级后开始记录，包含重试和失败请求。此处是次数上限，不是金额上限。</small>
 <p>数据采集、保存和阈值微信提醒无需模型。主动对话、手动学习和生成日报仍可使用。</p>
 <small>不会定时自动分析、自动学习或自动生成复盘。旧版每分钟分析设置不再生效。</small>
 <label>每日模型请求上限<input aria-label="每日模型请求上限" type="number" min={1} max={10000} value={daily} onChange={e=>D(Number(e.target.value))}/></label>
 <label>单轮任务请求上限<input aria-label="单轮任务请求上限" type="number" min={1} max={200} value={task} onChange={e=>T(Number(e.target.value))}/></label>
 <small>一次复杂任务可能包含多次模型调用。达到上限会明确停止，不会偷偷改用简化回答；可调高上限后继续提问。</small>
 <div className="quick"><button className="primary" onClick={()=>act('cost:save',{dailyRequests:daily,taskRequests:task},'用量控制已保存，无需调用API验证')}>保存用量控制</button></div>
 <p>{Object.entries(c.today.kinds||{}).map(([name,n])=>`${name} ${n}次`).join(' · ')||'今日尚无模型请求'}</p>
 <details><summary>最近任务用量</summary><small>每次提问或手动任务单独累计，包含其重试。Token按接口实际返回统计，未返回的部分不估算；字符数仅帮助定位输入膨胀，不等于Token或费用。</small>
 {(s.modelTasks||[]).slice().reverse().map((t:any)=><p key={t.taskKey}><strong>{t.kind} · {t.requests}次请求{t.failed?`（含${t.failed}次失败或重试）`:''}</strong><br/><small>最近响应 {new Date(t.updatedAt).toLocaleString('zh-CN')}</small><br/>累计Token {sum(t,'totalTokens')} · 输出 {sum(t,'outputTokens')}<br/>缓存创建 {sum(t,'cacheCreationTokens')} / 缓存读取 {sum(t,'cacheReadTokens')}<br/><small>单次最大文本输入 {count(t.maxInputChars)} 字符</small></p>)}
 {!(s.modelTasks||[]).length&&<p>升级后执行任务，这里会显示该轮用量。</p>}</details>
 <details><summary>高级：请求与缓存明细</summary><small>缓存创建与读取是不同计费项目；“未返回”不代表0。是否包含在输入内取决于接口格式，勿重复相加。费用以服务商账单为准。</small>
 {(s.modelUsage||[]).slice().reverse().map((u:any,i:number)=><p key={i}><strong>{u.kind} · {u.background?'后台':'主动/旧版记录'}</strong><br/><small>{new Date(u.at).toLocaleString('zh-CN')} · {u.ok?'完成':'失败或重试'}{u.taskRequest?` · 本轮第${u.taskRequest}次`:''}</small><br/>输入 {count(u.usage?.inputTokens)} / 输出 {count(u.usage?.outputTokens)} Token<br/>缓存创建 {count(u.usage?.cacheCreationTokens)} / 缓存读取 {count(u.usage?.cacheReadTokens??u.usage?.cachedInputTokens)} Token{u.inputParts?<><br/><small>输入字符：规则 {count(u.inputParts.system)} · 用户 {count(u.inputParts.user)} · 助手 {count(u.inputParts.assistant)} · 工具结果 {count(u.inputParts.tool)} · 工具定义 {count(u.inputParts.schemas)} · 其他 {count(u.inputParts.other)}</small></>:!u.usage&&<small> · 请求文本{u.textChars}字符</small>}</p>)}
 </details></div>;
}
