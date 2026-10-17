const fs = require('node:fs'), path = require('node:path')
const ts = require('../../frontend/node_modules/typescript')
const roots = ['frontend/src/app/painel', 'frontend/src/app/admin', ...['account','profiles','favorites','availability','moderation','renewal-reminders','redirects','administration','promotions'].map(x=>'frontend/src/features/'+x)]
const files = []
function walk(root) { for (const entry of fs.readdirSync(root,{withFileTypes:true})) { const file=path.join(root,entry.name); if(entry.isDirectory())walk(file);else if(file.endsWith('.tsx')&&!/\.test\.|\.stories\./.test(file))files.push(file) } }
roots.forEach(walk)
files.push(...['panel','panel-links','order-grid','evolution-integration'].map(x=>'frontend/src/components/domain/'+x+'.tsx'))
function icon(text,file) {
  if (/exclu|remov|retir|apagar/i.test(text)) return 'trash'
  if (/cancel|limpar|fechar/i.test(text)) return 'close'
  if (/voltar/i.test(text)) return 'back'
  if (/atualiz|recarreg|tent.*nov/i.test(text)) return 'refresh'
  if (/salvar|rascunho/i.test(text)) return 'save'
  if (/editar|trocar/i.test(text)) return 'edit'
  if (/buscar|explorar/i.test(text)) return 'search'
  if (/prévia|resultado|detalhe|ver /i.test(text)) return 'eye'
  if (/abrir|acessar|copiar/i.test(text)) return 'external'
  if (/subir/i.test(text)) return 'up'
  if (/descer/i.test(text)) return 'down'
  if (/sair/i.test(text)) return 'logout'
  if (/novo|nova|criar|adicionar/i.test(text)) return 'plus'
  if (/confirm|publicar|aprovar|concluir|enviar/i.test(text)) return 'check'
  if (/recusar|rejeitar/i.test(text)) return 'close'
  if (/coleç|c\.name/.test(text)&&file.includes('favorites')) return 'folder'
  if (/configur/i.test(text)) return 'settings'
  return 'next'
}
const changed=[]
for(const file of files) {
  let source=fs.readFileSync(file,'utf8')
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX), edits=[]
  function hasIcon(node) { if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)) {if(['svg','ActionIcon','Glyph','NavigationIcon'].includes(node.tagName.getText(ast)))return true} return ts.forEachChild(node,hasIcon)||false }
  function visit(node) {
    if(ts.isJsxElement(node)&&['Button','ButtonLink','button'].includes(node.openingElement.tagName.getText(ast))&&!node.children.some(hasIcon)) {
      const text=node.children.map(x=>x.getText(ast)).join(' ')
      edits.push({start:node.openingElement.end,text:`<ActionIcon name="${icon(text,file)}" />`})
    }
    ts.forEachChild(node,visit)
  }
  visit(ast)
  if(!edits.length)continue
  for(const edit of edits.sort((a,b)=>b.start-a.start)) source=source.slice(0,edit.start)+edit.text+source.slice(edit.start)
  if(!/import.*\bActionIcon\b/.test(source))source=source.replace(/(['"]use client['"];?\r?\n)/,'$1\nimport { ActionIcon } from \'@/components/ui/action-icon\'\n')
  if(!source.includes("import { ActionIcon }"))source="import { ActionIcon } from '@/components/ui/action-icon'\n"+source
  fs.writeFileSync(file,source);changed.push({file,buttons:edits.length})
}
console.log(JSON.stringify(changed))
