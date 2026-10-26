import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function RichText({text}:{text:string}){return <div className="rich-text"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{a:({href,children})=><a href={href} onClick={e=>{e.preventDefault();if(href)window.monitor.call('link:open',{url:href}).catch(()=>{});}}>{children}</a>,img:({alt})=><span>{alt||'图片链接'}</span>}}>{text||''}</ReactMarkdown></div>}
