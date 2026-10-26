const hasImages=messages=>messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='input_image'||p.type==='image_url'));
function deadline(controller,images,clock={setTimeout,clearTimeout}){
 const first=images?300000:90000,total=images?600000:300000;
 let idle=clock.setTimeout(()=>controller.abort('first-response-timeout'),first);
 const hard=clock.setTimeout(()=>controller.abort('total-timeout'),total);
 return {touch(){clock.clearTimeout(idle);idle=clock.setTimeout(()=>controller.abort('idle-timeout'),120000);},clear(){clock.clearTimeout(idle);clock.clearTimeout(hard);}};
}
function abortMessage(reason,images){
 if(reason==='first-response-timeout')return images?'图片分析等待超过5分钟，接口尚未返回内容。图片已保留，可重试或更换支持图片的模型。':'模型等待超过90秒，接口尚未返回内容，请重试。';
 if(reason==='idle-timeout')return '模型已连续2分钟没有返回新内容，请重试。';
 if(reason==='total-timeout')return '本次分析超过'+(images?'10':'5')+'分钟，请减少本次分析内容后重试。';
 return '已停止生成';
}
module.exports={hasImages,deadline,abortMessage};
