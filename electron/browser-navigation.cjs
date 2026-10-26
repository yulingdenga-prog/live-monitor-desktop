function browsable(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
function popupAllowed(raw){return raw==='about:blank'||browsable(raw);}
function menuItems(params,{open,copy,back,forward,reload,canBack,canForward}){
 const items=[];
 if(params.linkURL){items.push({label:'在新标签页打开链接',enabled:browsable(params.linkURL),click:()=>open(params.linkURL)},{label:'复制链接地址',click:()=>copy(params.linkURL)},{type:'separator'});}
 if(params.selectionText)items.push({label:'复制选中文字',click:()=>copy(params.selectionText)});
 if(params.isEditable)items.push({role:'cut',label:'剪切'},{role:'copy',label:'复制'},{role:'paste',label:'粘贴'},{role:'selectAll',label:'全选'},{type:'separator'});
 items.push({label:'后退',enabled:canBack,click:back},{label:'前进',enabled:canForward,click:forward},{label:'刷新',click:reload});
 if(browsable(params.pageURL))items.push({label:'复制当前网页地址',click:()=>copy(params.pageURL)});
 return items;
}
function viewOptions(popup=null){
 const options={webPreferences:{...popup?.webPreferences,preload:undefined,partition:'persist:merchant',nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:true}};
 if(popup?.webContents)options.webContents=popup.webContents;
 return options;
}
// Keep the actual Chromium/OS version, but omit application product tokens.
// Some merchant endpoints reject Electron/application identifiers although the page loads.
function merchantUserAgent(ua){
 return String(ua).replace(/\sElectron\/[^\s]+/g,'').replace(/(\(KHTML, like Gecko\))\s+.*?(?=Chrome\/)/, '$1 ');
}
module.exports={browsable,popupAllowed,menuItems,viewOptions,merchantUserAgent};
