import React,{useEffect,useState} from 'react';
export function BrowserAddress({tabId,url,onNavigate}:{tabId:string;url:string;onNavigate:(url:string)=>Promise<any>}){
 const [draft,D]=useState<string|null>(null),[busy,B]=useState(false);
 useEffect(()=>{D(null)},[tabId]);
 const go=async()=>{const raw=(draft??url).trim();const target=/^[a-z0-9.-]+\.[a-z]{2,}(?::[0-9]+)?(?:[/?#]|$)/i.test(raw)?'https://'+raw:raw;if(!target||busy)return;B(true);try{const ok=await onNavigate(target);if(ok)D(null);}finally{B(false)}};
 return <><input aria-label="网页地址" placeholder="输入或粘贴网址，按回车打开" value={draft??url??''} onChange={e=>D(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)void go()}}/><button disabled={busy||!(draft??url)?.trim()} onClick={go}>{busy?'打开中…':'前往'}</button></>;
}
