const test=require('node:test'),assert=require('node:assert/strict');
const {withEvidence}=require('../electron/evidence.cjs');
test('当前5行与分页20行分开传递，不重复合计',()=>{const r=withEvidence({referenceSources:[{source:'商品',tables:[{rows:Array(5).fill([])}],collectedTables:{rows:Array(20).fill([]),pages:[1,2,3,4].map(page=>({page})),complete:true,at:123}}]});assert.equal(r.dataQuality.sources[0].currentPageRows,5);assert.equal(r.dataQuality.sources[0].paginatedProductRows,20);assert.equal(r.dataQuality.sources[0].paginationAt,123);assert.deepEqual(r.dataQuality.sources[0].dates,[]);});
