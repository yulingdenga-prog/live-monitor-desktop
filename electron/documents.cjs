const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const LIMIT=120000;
async function parseDocument(file){
 const ext=path.extname(file).toLowerCase();if(fs.statSync(file).size>20*1024*1024)throw Error('单个文件不能超过20MB');
 let text='',notes=[];
 if(['.txt','.md','.csv'].includes(ext)){const b=fs.readFileSync(file);text=b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):new TextDecoder('utf-8',{fatal:true}).decode(b);}
 else if(ext==='.docx'){const r=await require('mammoth').extractRawText({path:file});text=r.value;if(r.messages.length)notes.push('文档包含解析提示；请核对预览。');notes.push('提取文字，不读取嵌入图片。');}
 else if(ext==='.pdf'){const {PDFParse}=require('pdf-parse');const parser=new PDFParse({data:fs.readFileSync(file)});try{const r=await parser.getText({first:80});text=r.text;if(r.total>80)notes.push('仅解析前80页。');}finally{await parser.destroy();}notes.push('只读取PDF文字层，图片和扫描页未做OCR。');}
 else if(ext==='.xlsx'){const ExcelJS=require('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.readFile(file);const parts=[];for(const sheet of book.worksheets.slice(0,10)){parts.push('工作表：'+sheet.name);sheet.eachRow((row,i)=>{if(i>2000)return;const cells=[];for(let c=1;c<=Math.min(row.cellCount,40);c++)cells.push(row.getCell(c).text);parts.push(cells.join('\t'));});}text=parts.join('\n');notes.push('每表最多2000行、40列，最多10表；公式采用文件已有值，不重新计算。');}
 else throw Error('支持PDF、DOCX、XLSX、TXT、MD、CSV；旧版DOC/XLS请先另存为新格式');
 text=text.replace(/\u0000/g,'').trim();if(!text)throw Error('未解析到文字。扫描PDF或图片请先转成可复制文字的文档。');
 if(text.length>LIMIT)notes.push('内容超过上限，仅保存前120000字。');
 return {id:crypto.randomUUID(),name:path.basename(file),text:text.slice(0,LIMIT),characters:Math.min(text.length,LIMIT),notes,at:Date.now(),enabled:true};
}
function documentContext(docs,shop,query=''){
 const selected=docs.filter(d=>d.shop===shop&&d.enabled).slice(-8),budget=Math.floor(32000/Math.max(1,selected.length));
 const tokens=[...new Set((query.match(/[a-z0-9]{2,}|[\u4e00-\u9fff]{2}/gi)||[]))];
 return selected.map(d=>{const chunks=d.text.match(/[\s\S]{1,1600}/g)||[];const ranked=chunks.map((text,i)=>({text,i,score:tokens.reduce((s,t)=>s+(text.includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score||a.i-b.i);const picked=ranked.slice(0,Math.max(1,Math.floor(budget/1600))).sort((a,b)=>a.i-b.i);return {name:d.name,importedAt:d.at,notes:d.notes,coverage:picked.length<chunks.length?'仅相关节选，并非全文；未选内容不能视为已阅读':'已提供保存的文字全文',excerpts:picked.map(c=>({section:c.i+1,text:c.text}))};});
}
module.exports={parseDocument,documentContext};
