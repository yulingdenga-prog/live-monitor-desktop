// Structured data is page-declared evidence, not verified checkout or live-room pricing.
function products(blocks){const result=[];let visited=0;
 function walk(node,depth=0){if(!node||typeof node!=='object'||depth>8||++visited>4000||result.length>=20)return;if(Array.isArray(node)){for(const n of node)walk(n,depth+1);return;}
  const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
  if(types.includes('Product')&&typeof node.name==='string'){
   const offers=(Array.isArray(node.offers)?node.offers:[node.offers]).filter(Boolean).slice(0,10).map(o=>{const value=o.price??o.lowPrice;const price=typeof value==='number'?value:typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value)?Number(value):null;return {price:Number.isFinite(price)&&price>=0?price:null,priceKind:o.price!=null?'标价':'最低起价',currency:String(o.priceCurrency||'未注明').slice(0,15),availability:String(o.availability||'').slice(0,120),seller:typeof o.seller==='string'?o.seller.slice(0,120):String(o.seller?.name||'').slice(0,120),validUntil:String(o.priceValidUntil||'').slice(0,40)};}).filter(o=>o.price!==null);
   if(offers.length)result.push({name:node.name.slice(0,200),sku:String(node.sku||'').slice(0,80),description:String(node.description||'').slice(0,800),offers,evidence:'页面声明的结构化商品价格；未核实实时库存、券后价或直播专享价'});
  }
  for(const [k,v]of Object.entries(node))if(k!=='offers')walk(v,depth+1);
 }
 for(const raw of blocks.slice(0,20)){if(typeof raw!=='string'||raw.length>150000)continue;try{walk(JSON.parse(raw))}catch{}}
 return result;
}
module.exports={products};
