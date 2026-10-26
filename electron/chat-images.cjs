function validate(images=[]){
 if(!Array.isArray(images)||images.length>4)throw Error('每条消息最多添加4张图片');
 let total=0;
 const seen=new Set();return images.map(image=>{
  if(typeof image?.data!=='string')throw Error('图片内容无效');
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.data);
  if(!match)throw Error('仅支持PNG、JPEG、WebP图片');
  const bytes=Buffer.from(match[2],'base64');total+=bytes.length;
  if(bytes.length>5*1024*1024||total>12*1024*1024)throw Error('单张图片最多5MB，合计最多12MB');
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid)throw Error('图片格式与内容不一致');
  if(seen.has(image.data))return null;seen.add(image.data);return {name:String(image.name||'图片').slice(0,100),data:image.data};
 }).filter(Boolean);
}
function content(text,images,protocol){
 if(!images.length)return text;
 return protocol==='responses'?[{type:'input_text',text},...images.map(i=>({type:'input_image',image_url:i.data,detail:'auto'}))]:[{type:'text',text},...images.map(i=>({type:'image_url',image_url:{url:i.data,detail:'auto'}}))];
}
module.exports={validate,content};
