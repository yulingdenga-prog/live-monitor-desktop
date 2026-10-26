const {Menu}=require('electron');
// Keep edit commands available even though the main application menu is hidden.
function install(win){
 const wc=win.webContents;
 wc.on('before-input-event',(event,input)=>{
  if(input.type==='keyDown'&&(input.control||input.meta)&&!input.alt&&input.key.toLowerCase()==='c'){
   event.preventDefault();wc.copy();
  }
 });
 wc.on('context-menu',(_event,p)=>{
  const items=[];
  if(p.selectionText)items.push({label:'复制选中文字',role:'copy'});
  if(p.isEditable){items.push({label:'剪切',role:'cut',enabled:p.editFlags.canCut},{label:'粘贴',role:'paste',enabled:p.editFlags.canPaste},{label:'全选',role:'selectAll'});}
  if(items.length)Menu.buildFromTemplate(items).popup({window:win});
 });
}
module.exports={install};
