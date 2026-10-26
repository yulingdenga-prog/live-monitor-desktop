import {RichText} from './rich-text';
import React,{useState} from 'react';
export function HermesPanel({state,act,skillsOnly=false}:any){
 const [selected,select]=useState<any>(null),[checking,check]=useState(false),[result,setResult]=useState('');
 const h=state.hermes;
 if(!h)return null;
 const load=async(id:string)=>select(await act('hermes:skill',{id}));
 return <div className="panel hermes-panel"><span className="eyebrow">LEARN FROM EXPERIENCE</span><h2>{skillsOnly?'助手方法':'助手引擎与方法'}</h2>
 <p>对话中说“记住这个方法，以后这样处理”，助手可整理方法。已采纳经验统一在经验库查看；这里管理内置方法和独立保存的方法。</p>
 {!skillsOnly&&<><label>对话助手<select value={h.engine} onChange={e=>act('hermes:engine',{engine:e.target.value})}><option value="hermes">Hermes · 持续学习</option><option value="legacy">原助手 · 兼容模式</option></select></label>
 <p><span className={'pill '+(h.available?'green':'')}>{h.available?'运行环境已内置':'运行文件不完整'}</span> <small>{h.checked?'核心已启动验证':'尚未检查'} · {h.status}</small></p>
 <button disabled={checking} onClick={async()=>{check(true);try{const r=await act('hermes:check');setResult(r?.text||'检查未通过，请查看页面提示');}finally{check(false)}}}>{checking?'正在检查…':'检查助手运行环境'}</button>{result&&<p role="status">{result}</p>}
 <p className="muted">共用上方模型连接。微信和数据提醒继续使用现有通道。技能按店铺保存，清空对话或更换 API 不会删除。</p></>}
 <h3>{state.shop||'通用对话'}的技能 · {h.skills.filter((s:any)=>!s.experience).length}</h3>
 {!h.skills.length&&<p className="muted">还没有保存技能。完成一次有用的任务后，可以让助手把方法整理进来。</p>}
 {h.skills.filter((s:any)=>!s.experience).map((s:any)=><div className="skill-item" key={s.id}><strong>{s.title}</strong> <small>{s.builtIn?'内置方法 v'+s.revision:s.experience?'已采纳经验':s.active?'v'+s.revision:'未启用'}{s.pending?' · 有待采纳版本':''}</small><p>{s.description}</p><div className="quick"><button onClick={()=>load(s.id)}>查看内容</button>{s.pending&&<><button onClick={async()=>{await act('hermes:review',{id:s.id,accept:true});await load(s.id)}}>采纳</button><button onClick={async()=>{await act('hermes:review',{id:s.id,accept:false});await load(s.id)}}>忽略候选</button></>}{s.canRollback&&<button onClick={async()=>{await act('hermes:rollback',{id:s.id});await load(s.id)}}>回退上一版</button>}</div></div>)}
 {selected&&<div className="skill-preview"><button onClick={()=>select(null)}>收起内容</button>{selected.active&&<><h3>已生效 · v{selected.revision}</h3><RichText text={selected.active.content}/><small>来源：{selected.active.sources.join('；')||'未记录'}</small></>}{selected.pending&&<><h3>待采纳版本</h3><RichText text={selected.pending.content}/><small>来源：{selected.pending.sources.join('；')||'未记录'}</small></>}</div>}
 </div>;
}
