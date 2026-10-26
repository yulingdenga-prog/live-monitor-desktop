import {useLayoutEffect,useRef} from 'react';
export function useChatScroll(key:string,revision:string){
 const container=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),following=useRef(true),touchY=useRef<number|null>(null);
 const selecting=()=>{const s=window.getSelection();return !!s&&!s.isCollapsed&&!!s.anchorNode&&!!container.current?.contains(s.anchorNode);};
 const bottom=()=>{const el=container.current;if(el&&following.current&&!selecting())el.scrollTop=el.scrollHeight;};
 useLayoutEffect(()=>{following.current=true;bottom();},[key]);
 useLayoutEffect(()=>{bottom();const frame=requestAnimationFrame(bottom);return()=>cancelAnimationFrame(frame)},[revision,key]);
 useLayoutEffect(()=>{const node=content.current;if(!node)return;const observer=new ResizeObserver(bottom);observer.observe(node);return()=>observer.disconnect()},[key]);
 return {container,content,follow:()=>{following.current=true},events:{
  onWheel:(e:any)=>{if(e.deltaY<0)following.current=false;},
  onTouchStart:(e:any)=>{touchY.current=e.touches[0]?.clientY??null;},
  onTouchMove:(e:any)=>{const y=e.touches[0]?.clientY;if(touchY.current!==null&&y>touchY.current)following.current=false;touchY.current=y;},
  onKeyDown:(e:any)=>{if(['PageUp','Home','ArrowUp'].includes(e.key))following.current=false},
  onPointerDown:()=>{following.current=false},
  onScroll:()=>{const el=container.current;if(el&&!selecting()&&el.scrollHeight-el.scrollTop-el.clientHeight<40)following.current=true;}
 }};
}
