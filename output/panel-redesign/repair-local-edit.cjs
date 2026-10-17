const fs = require('node:fs'), cp = require('node:child_process')
const files = ['frontend/src/features/administration/components/link-promotion-editor.tsx','frontend/src/app/admin/planos/editor.tsx','frontend/src/app/admin/visao/retention-panel.tsx','frontend/src/app/admin/estornos/page.tsx','frontend/src/app/admin/visao/office.tsx']
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
for (const file of files) {
  let source = fs.readFileSync(file,'utf8')
  const baseline = cp.execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'})
  const words = new Set((baseline+' ActionIcon ResponsiveTabs WorkspaceActions WorkspaceFilters RefreshButton EmptyState ComparisonBars WorkspaceSection AdminLinksBoard AdminLinkFilter AdminLinkRow AdminLinkStatus').match(/[\p{L}\p{N}_]*A[\p{L}\p{N}_]*/gu))
  const office = file.endsWith('office.tsx')
  if (office) source = source.replaceAll('A','<')
  for (const word of [...words].filter(word=>word!=='A').sort((a,b)=>b.length-a.length)) {
    const broken = word.replaceAll('A',office?'<':'c')
    source=source.replace(new RegExp('(?<![\\p{L}\\p{N}_])'+escape(broken)+'(?![\\p{L}\\p{N}_])','gu'),word)
  }
  source=source.replace('r. < conta continua ativa','r. A conta continua ativa')
  fs.writeFileSync(file,source)
}
const css = 'frontend/src/features/account/components/workspace.module.css'
let source = fs.readFileSync(css,'utf8')
const postcss = require('../../frontend/node_modules/postcss')
const root = postcss.parse(source)
root.walkRules(rule=>{rule.selector=rule.selector.replace(/(^|[,\s>+~(])c(?=[a-zA-Z])/g,'$1.')})
root.walkDecls(decl=>{decl.value=decl.value.replace(/c(?=\d)/g,'.')})
fs.writeFileSync(css,root.toString())
const submission='frontend/src/features/link-submission/components/submission-form.module.css'
source=fs.readFileSync(submission,'utf8').replaceAll('uustify','justify')
source=source.replace('.stepActions { display: flex; flex-wrap: wrap; justify-content: space-between;', '.stepActions { display: flex; flex-wrap: wrap; justify-content: flex-end;')
fs.writeFileSync(submission,source)
