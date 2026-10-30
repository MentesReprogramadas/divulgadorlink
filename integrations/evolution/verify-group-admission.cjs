// Run from the repository root; exercises only mocks, never a WhatsApp instance.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('../../backend/node_modules/typescript')
const patch = fs.readFileSync(__dirname + '/2.3.7-group-admission.patch', 'utf8').replace(/\r\n/g,'\n')
function additions(file) {
  const section = patch.split('--- a/' + file + '\n')[1].split('\n--- a/')[0]
  return section.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n')
}
function compile(source, extra = {}) {
  const result = ts.transpileModule(source, { reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} })
  assert.equal(result.diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error).length, 0)
  const context = {exports:{}, ...extra}
  vm.runInNewContext(result.outputText, context)
  return context.exports
}
const schemas = compile(additions('src/validate/group.schema.ts'), {v4:()=>'fixture'})
assert(new RegExp(schemas.joinApprovalSchema.properties.groupJid.pattern).test('123@g.us'))
assert(!new RegExp(schemas.joinApprovalSchema.properties.groupJid.pattern).test('123@s.whatsapp.net'))
const participantPattern = new RegExp(schemas.requestUpdateSchema.properties.participants.items.pattern)
assert(participantPattern.test('123@lid'))
assert(participantPattern.test('5511999999999@s.whatsapp.net'))
assert(!participantPattern.test('arbitrary'))
assert.equal(schemas.requestUpdateSchema.additionalProperties, false)
const routes = additions('src/api/routes/group.router.ts')
assert.equal((routes.match(/\.\.\.guards/g) || []).length, 4)
const methods = additions('src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts').split('  private requireAdmissionConnection()')[1]
const {AdmissionService} = compile('export class AdmissionService { connectionStatus = {state:"open"}; client; private requireAdmissionConnection()' + methods + '}', {BadRequestException:Error})
async function verify() {
  const service = new AdmissionService(), calls = []
  service.client = {
    groupJoinApprovalMode:async(...args)=>calls.push(args),
    groupRequestParticipantsList:async()=>[{jid:'123@lid'}],
    groupRequestParticipantsUpdate:async(group,participants,action)=>{calls.push([group,participants,action]);return participants.map(jid=>({jid,status:'200'}))},
  }
  await service.joinApprovalMode({groupJid:'123@g.us',enabled:true})
  assert.deepEqual(calls[0], ['123@g.us','on'])
  assert.deepEqual(JSON.parse(JSON.stringify(await service.requestParticipants({groupJid:'123@g.us'}))), {participants:['123@lid']})
  assert.deepEqual(JSON.parse(JSON.stringify(await service.updateRequestParticipants({groupJid:'123@g.us',participants:['123@lid'],action:'approve'}))), {participants:[{jid:'123@lid',status:'200'}]})
  service.connectionStatus.state = 'close'
  await assert.rejects(service.joinApprovalMode({groupJid:'123@g.us',enabled:true}), /not connected/)
  assert.equal(calls.length, 2)
  console.log('Evolution admission extension: syntax, guards, schemas, LIDs, success and closed connection checks passed')
}
verify().catch(error=>{console.error(error.message);process.exitCode=1})
