function asksIdentity(text){return text.length<=180&&/(?:什么|哪个|哪种|什么版本|哪一款).{0,8}模型|模型.{0,8}(?:名称|名字|型号|版本)|你是.{0,12}(?:GPT|deepseek)|你用的.{0,6}(?:是什么|哪个)/i.test(text)&&!/(推荐|比较|哪个好|如何|怎么选|切换|更换|改成|设置成)/.test(text);}
function identity(c){
 if(!c.model)return '当前还没有保存模型。请到设置选择模型并保存验证。';
 const provider=({openai:'OpenAI',deepseek:'DeepSeek',custom:'自定义兼容服务'})[c.provider]||'自定义兼容服务';
 let host='';try{host=new URL(c.endpoint).host;}catch{}
 return `当前配置的模型是 ${c.model}，服务商：${provider}${host?'，接口：'+host:''}。`+(c.provider==='custom'?'这是软件实际请求的模型名称，中转服务的底层模型由服务商决定。':'');
}
module.exports={asksIdentity,identity};
