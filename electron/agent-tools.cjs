// One catalog is shared by planning and validation; tool implementations keep
// their own object ownership, scope, navigation and path checks.
const catalog={
 web_read:{description:"继续读取web_search结果或正文links中已经出现的公开文章地址，不接受猜测链接",args:{url:"string"}},
 web_search:{description:'独立联网搜索并读取最多3篇公开网页正文。query只写公共研究主题，不包含用户经营金额、身份、密钥。不要把搜索摘要当已核实事实；可换关键词继续查。结果可用于本次回答，不自动加入知识库',args:{query:'string'}},
 research_learn:{description:'按主题联网阅读并提出知识候选，等待用户核实采纳。不会自动录入正式知识库',args:{query:'string'}},
 panel_inputs:{description:'列出当前主来源快照可用字段及真实数值、日期、店铺。新增面板前先读取',args:{}},
 panel_stage:{description:'新增或替换当前店铺分析面板候选。spec={title,cards:[{label,unit,expression}]}。表达式只允许{op:"field",key:真实字段名}、{op:"number",value:数字}、{op:add/subtract/multiply/divide/min/max/gt/lt,left:表达式,right:表达式}，不可填代码或HTML。先按用户需求解释计算口径，不能凭空设定利润成本。最多12卡',args:{spec:'object'}},
 panel_test:{description:'用当前实际数据运行候选面板计算，缺失字段或除0失败',args:{panelId:'string'}},
 panel_apply:{description:'重测并启用面板，保留上一版，可在数据资料里看到即时计算结果。不操作网页或投流',args:{panelId:'string'}},
 panel_rollback:{description:'回退当前店铺上一次面板',args:{}},
 inspect:{description:'检查已打开网页：正文节选、字段、链接和翻页入口',args:{tabId:'tab'}},
 read_page:{description:'读取已加载正文并保存为运营资料，含手册/文章/表格。不是联网搜索，不自动滚动',args:{tabId:'tab'}},
 scroll_page:{description:'向下或向上滚动一屏以加载数据，随后重新检查/采集',args:{tabId:'tab',direction:['down','up']}},
 navigate:{description:'进入inspect返回的实际数据链接、分页或数据页签，使用targetId',args:{targetId:'string'}},
 adapt:{description:'按用户需求选择已观察到的真实字段并保存持续采集规则',args:{tabId:'tab'}},
 collect:{description:'立即读取已适配指标',args:{tabId:'tab'}},
 subscribe:{description:'启用该来源的持续采集',args:{tabId:'tab'}},
 unsubscribe:{description:'停用该来源的持续采集',args:{tabId:'tab'}},
 open_data:{description:'打开用户原文明确给出的数据或文档链接',args:{url:'string'}},
 clear_chat:{description:'用户明确要求时清空当前会话；保留记忆资料',args:{}},
 list_documents:{description:'查看当前店铺资料ID、名称和启用状态',args:{}},
 read_document:{description:'按资料ID读取一段原文。offset从0开始，可分段继续',args:{documentId:'string',offset:'offset'}},
 set_document:{description:'启用或停用指定资料参与分析，不删除文件',args:{documentId:'string',enabled:'boolean'}},
 list_reports:{description:'列出当前店铺已生成的报告',args:{}},
 read_report:{description:'按ID读取当前店铺的报告',args:{reportId:'integer'}},
 generate_report:{description:'按YYYY-MM-DD日期排队生成日报，排队不等于生成完成',args:{day:'date'}},
 read_memory:{description:'读取当前经营记忆和用户偏好',args:{}},
 remember:{description:'记录用户明确要求，保留既有要求',args:{}},
 experience:{description:'保存用户反馈为待验证经验',args:{}},
 learn:{description:'安排官方资料学习；需用户要求学习/查询规则',args:{}},
 ui_read:{description:'读取可修改的界面配置与范围',args:{}},
 ui_update:{description:'修改字号、聊天宽度、紧凑程度、强调色，立即生效并自动备份',args:{changes:'object'}},
 ui_rollback:{description:'恢复上一次界面配置',args:{}},
 code_list:{description:'列出软件可读源文件；不访问登录、密钥或经营资料',args:{}},
 code_read:{description:'读取源文件与hash，最多12000字符，可用offset继续',args:{file:'string',offset:'offset'}},
 code_stage:{description:'在软件目录保存精确文本替换补丁，必须使用code_read的hash。不会执行候选代码',args:{file:'string',hash:'string',before:'longstring',after:'longstring'}},
 code_check:{description:'对候选补丁进行语法及越权静态检查，输出差异和检查结果。通过不表示运行测试或已应用',args:{patchId:'string'}},
 code_changes:{description:'查看代码候选补丁及状态。任意核心代码自动应用尚未开放，不能声称已升级',args:{}}
};
function validateStep(s,tabs){
 const spec=catalog[s.tool];if(!spec)throw Error('没有这个工具：'+s.tool);
 const result={tool:s.tool};
 for(const [key,type] of Object.entries(spec.args)){
  let value=s[key];if(type==='offset'&&value===undefined)value=0;
  if(Array.isArray(type)){if(!type.includes(value))throw Error(key+'取值不支持');}
  else if(type==='tab'){if(!tabs.some(t=>t.id===value))throw Error('只能操作当前已有的数据标签');}
  else if(type==='boolean'){if(typeof value!=='boolean')throw Error(key+'必须为布尔值');}
  else if(type==='integer'||type==='offset'){if(!Number.isSafeInteger(value)||value<(type==='offset'?0:1))throw Error(key+'不是有效整数');}
  else if(type==='date'){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('日期无效');}
  else if(type==='object'){if(!value||Array.isArray(value)||typeof value!=='object')throw Error(key+'必须为对象');}
  else if(typeof value!=='string'||!value.trim()||value.length>(type==='longstring'?30000:500))throw Error(key+'无效或过长');
  result[key]=value;
 }
 return result;
}
module.exports={catalog,validateStep};
