// Only formatting aliases. Different business definitions must never be substituted.
function canonical(label){const key=String(label||'').replace(/\s/g,'').replace(/（/g,'(').replace(/）/g,')');
 if(/^综合成本(?:\(元\))?$/.test(key))return '综合成本(元)';
 if(/^净成交金额(?:\(元\))?$/.test(key))return '净成交金额(元)';
 if(/^综合营销ROI$/i.test(key))return '综合营销ROI';
 if(/^实时在线人数(?:\(人\))?$/.test(key))return '实时在线人数';
 return key;
}
function normalize(metrics){return metrics.map(m=>({...m,label:canonical(m.label),...(canonical(m.label)!==m.label?{sourceLabel:m.label}:{})}));}
module.exports={canonical,normalize};
