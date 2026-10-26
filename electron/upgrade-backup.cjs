const fs=require('fs'),path=require('path');
function prepare(dataDir,workspace,version){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid version');
 const root=path.join(dataDir,'升级备份'),marker=path.join(root,version+'.json');
 if(fs.existsSync(marker))return;
 fs.mkdirSync(root,{recursive:true});
 const dest=path.join(root,version+'-'+Date.now());fs.mkdirSync(dest);
 const copied=[];
 for(const name of ['monitor.sqlite3','运营助手记忆.md']){const src=path.join(dataDir,name);if(fs.existsSync(src)){fs.copyFileSync(src,path.join(dest,name));copied.push(name);}}
 if(fs.existsSync(workspace)){fs.cpSync(workspace,path.join(dest,'AgentWorkspace'),{recursive:true,filter:src=>!fs.lstatSync(src).isSymbolicLink()});copied.push('AgentWorkspace');}
 fs.writeFileSync(marker,JSON.stringify({version,at:Date.now(),path:dest,copied}));
}
module.exports={prepare};
