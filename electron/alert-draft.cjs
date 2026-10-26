// Local draft only. A human must inspect the resolved metric and save the form.
function draft(text,choices){
 text=String(text||'').trim();if(!text||text.length>300)throw Error('请用一句话描述提醒条件');
 if(/不要|取消|停止|关闭|不提醒|或者|或是|并且|同时/.test(text))throw Error('请在表单中分别设置或停用提醒；一句话草稿只支持一个条件');
 const numbers=text.match(/\d+(?:\.\d+)?/g)||[];if(numbers.length!==1)throw Error('请先只写一个指标和一个阈值，持续时间在下方选择');
 const value=Number(numbers[0]),money=/消耗|成本|金额|预算/.test(text),roi=/roi|投产/i.test(text);
 const candidates=choices.filter(c=>text.includes(c.label)||money&&/成本|消耗/.test(text)&&/成本|消耗/.test(c.label)||/成交金额|销售额/.test(text)&&/成交金额/.test(c.label)||roi&&/ROI/i.test(c.label)||/在线/.test(text)&&/在线/.test(c.label)||/退款率/.test(text)&&/退款.*率|退款.*占比/.test(c.label));
 if(!candidates.length)throw Error('当前实时来源里还没有匹配指标，请先确认采集或直接在下方选择');
 if(/[万千]/.test(text)&&!money)throw Error('请直接填写完整数值，百分比按百分数填写');
 const threshold=value*(/\d(?:\.\d+)?\s*万/.test(text)?10000:/\d(?:\.\d+)?\s*千/.test(text)?1000:1);
 const operator=/不低于|不少于|达到|超过|高于|大于|消耗到|到\s*\d/.test(text)?(/超过|高于|大于/.test(text)&&!/(?:或等于|及以上)/.test(text)?'gt':'gte'):/不超过|不高于|降至|低于|小于/.test(text)?(/低于|小于/.test(text)&&!/(?:或等于|及以下)/.test(text)?'lt':'lte'):'gte';
 return {name:text.slice(0,80),threshold,operator,candidates:candidates.map(c=>c.key),metricKey:candidates.length===1?candidates[0].key:'',note:candidates.length===1?'已填入草稿，请核对后保存；尚未启用。':'有多个匹配指标，请选择正确来源再保存；尚未启用。'};
}
module.exports={draft};
