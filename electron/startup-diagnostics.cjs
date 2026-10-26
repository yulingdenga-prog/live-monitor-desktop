const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function install(){const {app,dialog}=require('electron');let stage='加载程序',ready=false,failed=false;let file;
 try{file=path.join(app.getPath('userData'),'启动诊断.log');fs.mkdirSync(path.dirname(file),{recursive:true});}catch{file=path.join(os.tmpdir(),'直播监测-启动诊断.log');}
 const write=(message)=>{try{if(fs.existsSync(file)&&fs.statSync(file).size>256000)fs.renameSync(file,file+'.previous');fs.appendFileSync(file,new Date().toISOString()+' '+message+'\n');}catch{}};
 const fail=e=>{write(stage+'失败 '+String(e?.code||e?.name||'Error')+' '+String(e?.message||e).replace(/sk-[\w-]+|Bearer\s+\S+/gi,'[已隐藏]').slice(0,500));if(!ready&&!failed){failed=true;dialog.showErrorBox('直播监测未能启动','启动停在：'+stage+'。\n请保留原数据和软件目录，并将此日志提供给维护人员：\n'+file+'\n\n请勿删除数据文件夹或仅替换单个程序文件。');app.exit(1);}};
 process.on('uncaughtException',fail);process.on('unhandledRejection',fail);
 write('启动 '+app.getVersion());return {stage:s=>{stage=s;write(s);},ready:()=>{ready=true;stage='运行中';write('主界面已加载');},fail};
}
module.exports={install};
