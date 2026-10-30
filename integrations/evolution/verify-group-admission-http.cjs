// Uses the official patched router, controller, auth/instance guards and schemas with isolated fixtures.
// Never loads provider server.module/env.config, starts WhatsApp, or connects a database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const {createRequire} = require('node:module')
const ts = require('../../backend/node_modules/typescript')
const root = path.resolve(process.argv[2] || 'output/evolution-admission-build')
const providerRequire = createRequire(path.join(root,'package.json'))
const express = providerRequire('express')
providerRequire('express-async-errors')
const HttpStatus = {OK:200,CREATED:201,BAD_REQUEST:400,UNAUTHORIZED:401,FORBIDDEN:403,NOT_FOUND:404,INTERNAL_SERVER_ERROR:500}
const calls = [], channels = {}, fixtures = {
  alpha:{name:'alpha',token:'alpha-fixture'},
  beta:{name:'beta',token:'beta-fixture'},
}
const server = {
  waMonitor:{waInstances:channels},
  prismaRepository:{instance:{findUnique:async({where})=>fixtures[where.name] || null,findMany:async({where})=>fixtures[where.name]?[fixtures[where.name]]:[]}},
  cache:{has:async()=>false},
}
const configService = {get:key=>({
  AUTHENTICATION:{API_KEY:{KEY:'global-fixture'}},
  DATABASE:{SAVE_DATA:{INSTANCE:true}},
  CACHE:{REDIS:{ENABLED:false,SAVE_INSTANCES:false}},
}[key])}
const cache = new Map()
function load(file) {
  file = path.resolve(root,file)
  if(cache.has(file))return cache.get(file).exports
  const module = {exports:{}}
  cache.set(file,module)
  const localRequire = name=>{
    if(name === '@api/server.module')return server
    if(name === '@config/env.config')return {configService}
    if(name === '@config/logger.config')return {Logger:class {error() {}}}
    if(name === '@api/routes/index.router' || (name === './index.router' && file.endsWith('group.router.ts')))return {HttpStatus}
    if(name === '@validate/validate.schema')return load('src/validate/group.schema.ts')
    let target
    if(name === '@exceptions')target = 'src/exceptions/index.ts'
    else if(name.startsWith('@api/'))target = 'src/api/' + name.slice(5) + '.ts'
    else if(name.startsWith('.'))target = path.resolve(path.dirname(file), name + '.ts')
    else return providerRequire(name)
    return load(target)
  }
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
  vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:file})(localRequire,module,module.exports)
  return module.exports
}
const {GroupController} = load('src/api/controllers/group.controller.ts')
server.groupController = new GroupController(server.waMonitor)
const {BadRequestException} = load('src/exceptions/index.ts')
const serviceSource = fs.readFileSync(path.join(root,'src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts'),'utf8')
const ast = ts.createSourceFile('service.ts',serviceSource,ts.ScriptTarget.Latest,true)
const serviceClass = ast.statements.find(node=>ts.isClassDeclaration(node) && node.name.text === 'BaileysStartupService')
const names = ['requireAdmissionConnection','joinApprovalMode','requestParticipants','updateRequestParticipants']
const methods = serviceClass.members.filter(member=>names.includes(member.name?.getText(ast))).map(member=>member.getText(ast)).join('\n')
assert.equal(serviceClass.members.filter(member=>names.includes(member.name?.getText(ast))).length,4)
const compiled = ts.transpileModule('export class FixtureService { connectionStatus = {state:"close"}; client;\n'+methods+'}',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const context = {exports:{},BadRequestException}
vm.runInNewContext(compiled,context)
const alpha = new context.exports.FixtureService()
alpha.client = {
  groupJoinApprovalMode:async(...args)=>calls.push(['mode',...args]),
  groupRequestParticipantsList:async(...args)=>{calls.push(['list',...args]);return [{jid:'123@lid'}]},
  groupRequestParticipantsUpdate:async(...args)=>{calls.push(['approve',...args]);return [{jid:'123@lid',status:'200'}]},
}
channels.alpha = alpha
channels.beta = {} // Separate provider without this capability; alpha token must not select it via query.
const {authGuard} = load('src/api/guards/auth.guard.ts')
const {instanceExistsGuard,instanceLoggedGuard} = load('src/api/guards/instance.guard.ts')
const {GroupRouter} = load('src/api/routes/group.router.ts')
const app = express()
app.use(express.json())
app.use('/group',new GroupRouter(instanceExistsGuard,instanceLoggedGuard,authGuard.apikey).router)
app.use((error,_request,response,_next)=>response.status(error.status || 500).json({error:error.error || 'Internal Error'}))
async function run() {
  const listener = app.listen(0,'127.0.0.1')
  await new Promise(resolve=>listener.once('listening',resolve))
  const base = 'http://127.0.0.1:'+listener.address().port
  let checks = 0
  async function request(route,{key='alpha-fixture',method='GET',body,status=200}={}) {
    const response = await fetch(base+route,{method,headers:{...(key?{apikey:key}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
    assert.equal(response.status,status,route)
    checks++
    return response.json()
  }
  try {
    for(const key of ['', 'wrong-fixture', 'beta-fixture'])await request('/group/admissionCapabilities/alpha',{key,status:401})
    await request('/group/admissionCapabilities/missing',{status:404})
    assert.deepEqual(await request('/group/admissionCapabilities/alpha'),{version:1,joinApproval:true})
    assert.deepEqual(await request('/group/admissionCapabilities/alpha?instanceName=beta'),{version:1,joinApproval:true})
    await request('/group/joinApprovalMode/alpha?groupJid=123@g.us',{method:'POST',body:{enabled:true},status:400})
    await request('/group/requestParticipants/alpha?groupJid=123@g.us',{status:400})
    await request('/group/updateRequestParticipants/alpha?groupJid=123@g.us',{method:'POST',body:{action:'approve',participants:['123@lid']},status:400})
    assert.equal(calls.length,0)
    alpha.connectionStatus.state = 'open'
    await request('/group/joinApprovalMode/alpha?groupJid=123@g.us',{method:'POST',body:{enabled:'true'},status:400})
    await request('/group/updateRequestParticipants/alpha?groupJid=123@g.us',{method:'POST',body:{action:'approve',participants:['bad-jid']},status:400})
    await request('/group/updateRequestParticipants/alpha?groupJid=123@g.us',{method:'POST',body:{action:'approve',participants:['123@lid'],extra:true},status:400})
    await request('/group/requestParticipants/alpha?groupJid=123@evil.test',{status:400})
    assert.equal(calls.length,0)
    assert.deepEqual(await request('/group/joinApprovalMode/alpha?groupJid=123@g.us',{method:'POST',body:{enabled:true}}),{success:true})
    assert.deepEqual(await request('/group/requestParticipants/alpha?groupJid=123@g.us'),{participants:['123@lid']})
    assert.deepEqual(await request('/group/updateRequestParticipants/alpha?groupJid=123@g.us',{method:'POST',body:{action:'approve',participants:['123@lid']}}),{participants:[{jid:'123@lid',status:'200'}]})
    assert.deepEqual(calls.map(value=>JSON.parse(JSON.stringify(value))),[['mode','123@g.us','on'],['list','123@g.us'],['approve','123@g.us',['123@lid'],'approve']])
    console.log('Evolution admission HTTP: '+checks+' checks passed; real router/guards/controller/schema, mocked repository/client; no external connections')
  } finally {await new Promise(resolve=>listener.close(resolve))}
}
run().catch(error=>{console.error(error);process.exitCode=1})
