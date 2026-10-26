import React,{forwardRef,memo,useImperativeHandle,useRef,useState} from 'react';
export type DraftHandle={get:()=>string;set:(text:string)=>void};
export const ChatDraft=memo(forwardRef<DraftHandle,{initialText:string;onText:(text:string)=>void;onSend:()=>void;onImages:(files:File[])=>void}>(function ChatDraft({initialText,onText,onSend,onImages},ref){
 const [text,setText]=useState(initialText);const current=useRef(initialText);
 const update=(value:string)=>{current.current=value;setText(value);onText(value)};
 useImperativeHandle(ref,()=>({get:()=>current.current,set:update}),[]);
 return <textarea value={text} onChange={e=>update(e.target.value)} onPaste={e=>{const files=Array.from(e.clipboardData.items).filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter((f):f is File=>!!f);if(files.length){e.preventDefault();onImages(files);}}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();onSend()}}} placeholder="告诉我运营问题，或说“采集这个页面里的商品数据”…" rows={3}/>;
}));
