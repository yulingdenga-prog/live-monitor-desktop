function withEvidence(ctx){
 ctx.dataQuality={generatedAt:Date.now(),priority:'本次数据状态优先于旧聊天、旧报告及记忆中的采集数量；不得沿用已过时的5/20结论。',sources:[...(ctx.relatedSources||[]),...(ctx.referenceSources||[])].map(s=>{
  const full=s.collectedTables;
  return {source:s.source,at:s.at,dates:s.dates||[],tableTimeScopes:(s.tables||[]).map(t=>({headers:t.headers,timeScope:t.timeScope||null})),currentPageRows:(s.tables||[]).reduce((n,t)=>n+t.rows.length,0),paginatedProductRows:full?.rows?.length||0,pagesRead:full?.pages?.map(p=>p.page)||[],paginationComplete:full?.complete===true,paginationAt:full?.at||null,coverage:full?.coverage||s.coverage,note:'当前页与分页合集存在重叠，商品分析优先用分页合集；不同模块分别分析，禁止重复相加。采集完整不等于日期及统计口径已核实。'};
 })};return ctx;
}
module.exports={withEvidence};
