"""Application adapter for the unmodified, pinned Hermes AIAgent core.

Only application-registered tools are enabled. No Hermes messaging gateway,
scheduler, shell, plugin installer, or independent model credential is started.
"""
import sys, os, json, threading, logging

sys.stdout=sys.stderr
lock=threading.Lock()
def emit(value):
    with lock:
        data=(json.dumps(value,ensure_ascii=False)+'\n').encode('utf-8')
        while data:
            data=data[os.write(1,data):]

init=json.loads(sys.stdin.readline())
sys.path.insert(0,init['source'])
os.environ['HERMES_HOME']=init['home']
os.environ['HERMES_RUNTIME_DIR']=init['home']
os.environ['HERMES_WORKSPACE_DIR']=init['home']
os.environ['OPENAI_BASE_URL']=init['baseUrl']
os.environ['OPENAI_API_KEY']=init['token']
os.environ['OPENAI_MODEL']=init['model']
os.chdir(init['home'])
logging.disable(logging.CRITICAL)

def dispatch(name,args):
    import urllib.request
    body=json.dumps({'name':name,'args':args},ensure_ascii=False).encode('utf-8')
    request=urllib.request.Request(init['baseUrl']+'/lm/tool',data=body,
        headers={'Authorization':'Bearer '+init['token'],'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=100) as response:
        return response.read().decode('utf-8')

try:
    emit({'type':'debug','phase':'import'})
    from run_agent import AIAgent
    from tools.registry import registry
    from toolsets import create_custom_toolset
    for spec in init['tools']:
        name=spec['name']
        registry.register(name=name,toolset='live_monitor',schema=spec,
                          handler=lambda args,_name=name,**kw:dispatch(_name,args))
    create_custom_toolset('live_monitor','直播监测提供的工具',[x['name'] for x in init['tools']])
    if init.get('check'):
        emit({'type':'result','text':'Hermes 核心导入成功','tools':[x['name'] for x in init['tools']]})
    else:
        agent=AIAgent(base_url=init['baseUrl'],api_key=init['token'],provider='custom',
                      api_mode='chat_completions',model=init['model'],enabled_toolsets=['live_monitor'],
                      quiet_mode=True,save_trajectories=False,skip_context_files=True,skip_memory=True,
                      skip_background_review=True,load_soul_identity=False,max_iterations=24,
                      run_budget_seconds=480,max_tokens=6000,cwd=init['home'],
                      session_id=init['id'],platform='live-monitor')
        emit({'type':'debug','phase':'agent_created'})
        actual={x['function']['name'] for x in agent.tools}
        expected={x['name'] for x in init['tools']}
        if actual!=expected:raise RuntimeError('Hermes工具边界不匹配: extra='+str(sorted(actual-expected))+' missing='+str(sorted(expected-actual)))
        emit({'type':'ready','tools':sorted(actual)})
        result=agent.run_conversation(init['query'],system_message=init['system'],conversation_history=init.get('history',[]))
        if result.get('failed') or result.get('interrupted'):raise RuntimeError(result.get('error') or 'Hermes任务未完成')
        emit({'type':'result','text':result.get('final_response',''),'messages':result.get('messages',[]),'calls':result.get('api_calls',0)})
        agent.close()
except Exception as exc:
    emit({'type':'error','error':str(exc)[:600],'kind':type(exc).__name__})
