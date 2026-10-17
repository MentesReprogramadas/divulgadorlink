const fs = require('fs'); const path = require('path')
const root = 'C:/VSCODE/divulgadorlinks/frontend'
const ts = require(root + '/node_modules/typescript')
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? item.name === '.runtime' || item.name === 'visual-baselines' ? [] : files(path.join(dir,item.name)) : [path.join(dir,item.name)]) }
for (const file of files(root + '/e2e').filter(f => f.endsWith('.ts') && !f.endsWith('select-control.ts'))) {
  let source = fs.readFileSync(file,'utf8'); const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true); const edits=[]
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'selectOption') {
      edits.push({start:node.getStart(ast),end:node.end,text:`selectOption(${node.expression.expression.getText(ast)}, ${node.arguments.map(a=>a.getText(ast)).join(', ')})`})
    }
    ts.forEachChild(node,visit)
  } visit(ast)
  if(edits.length) { for(const edit of edits.sort((a,b)=>b.start-a.start)) source=source.slice(0,edit.start)+edit.text+source.slice(edit.end); source="import { selectOption } from './select-control'\n"+source; fs.writeFileSync(file,source) }
}
const labels=['Período','Rede','Rede do link','Assunto do link','Situação do link','Ordenar por','Motivo']
for (const file of files(root + '/src').filter(f=>f.endsWith('.test.tsx'))) {
 let s=fs.readFileSync(file,'utf8'); let changed=false
 s=s.replace(/fireEvent\.change\((screen\.getByLabelText\('([^']+)'\)), \{ target: \{ value: ('[^']+') \} \}\)/g,(all,control,label,value)=>{if(!labels.includes(label))return all;changed=true;return `await chooseSelect(${control}, ${value})`})
 if(changed) {
  s="import { chooseSelect } from '@/test-select'\n"+s
  s=s.replace(/it\(([^\n]*), \(\) => \{/g,'it($1, async () => {')
  fs.writeFileSync(file,s)
 }
}
