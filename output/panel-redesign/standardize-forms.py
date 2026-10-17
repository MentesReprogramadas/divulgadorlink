from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks/frontend/src')
def rw(file,transform):
 p=root/file;s=p.read_text(encoding='utf-8');p.write_text(transform(s),encoding='utf-8')
def redirects(s):
 s=s.replace('import { WorkspaceActions }','import { WorkspaceActions, WorkspaceFilters }')
 start=s.index('    <div className={styles.actions}><Button disabled=');end=s.index('</div>',start)
 s=s[:start]+s[start:end].replace('<div className={styles.actions}>','<WorkspaceActions>')+'</WorkspaceActions>'+s[end+6:]
 s=s.replace('<h3>Seus endereços</h3>', '').replace('<p className={styles.note}>Clique em Novo link permanente para criar seu primeiro endereço.</p>', '<EmptyState />')
 s=s.replace('<form className={styles.range} aria-label="Filtrar acessos"', '<WorkspaceActions><Button form="redirect-range" disabled={pending}>Filtrar acessos</Button></WorkspaceActions><WorkspaceFilters id="redirect-range" label="Filtrar acessos"')
 s=s.replace('<Button disabled={pending}>Filtrar acessos</Button></form>', '</WorkspaceFilters>')
 s=s.replace('<Button variant="secondary" disabled={pending} onClick={() => setEditing(true)}>Editar destino</Button>', '<WorkspaceActions><Button variant="secondary" disabled={pending} onClick={() => setEditing(true)}>Editar destino</Button></WorkspaceActions>')
 return s
rw('features/redirects/redirect-screen.tsx',redirects)
rw('features/redirects/components/redirects.module.css', lambda s:s.replace('.section { display: grid; gap: var(--space-4); min-width: 0; }','.section { display: grid; gap: var(--space-4); min-width: 0; padding: var(--space-6); background: var(--surface-raised); border: 1px solid var(--border-default); border-radius: var(--radius-lg); }'))
def finance(s):
 s=s.replace("import { Select }", "import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'\nimport { Select }")
 s=s.replace('<form className="finance-filters" onSubmit={(event) => { event.preventDefault(); setApplied(filters) }}>','<WorkspaceActions><Button form="finance-filters" type="submit">Aplicar</Button></WorkspaceActions><WorkspaceFilters id="finance-filters" label="Filtrar financeiro" onSubmit={(event) => { event.preventDefault(); setApplied(filters) }}>')
 s=s.replace('        <Button type="submit">Aplicar</Button>\n      </form>','      </WorkspaceFilters>')
 return s
rw('app/admin/visao/finance-panel.tsx',finance)
def performance(s):
 s="import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'\n"+s
 s=s.replace('<form method="get" className={styles.filters} aria-label="Filtrar relatório">','<><WorkspaceActions><Button type="submit" form="performance-filters">Aplicar período</Button></WorkspaceActions><WorkspaceFilters id="performance-filters" method="get" label="Filtrar relatório">')
 s=s.replace('    <Button type="submit">Aplicar período</Button>\n  </form>','  </WorkspaceFilters></>')
 return s
rw('features/promotions/components/performance-report.tsx',performance)
for f in ['features/moderation/report-queue.tsx','features/availability/url-proposal-queue.tsx']:
 def queue(s):
  import re
  s=s.replace("import { WorkspaceActions", "import { RefreshButton } from '@/components/layout/workspace-actions'\nimport { WorkspaceActions",1)
  s=re.sub(r'<Button(?: type="button" variant="secondary"| variant="secondary" type="button") disabled=\{state.kind === \'loading\'\} onClick=\{(.*?)\}>Atualizar fila</Button>',r'<RefreshButton label="Atualizar fila" disabled={state.kind === \'loading\'} onClick={\1} />',s)
  s=s.replace("\\'loading\\'", "'loading'")
  if f.endswith('url-proposal-queue.tsx'): s=s.replace("import { Button, ButtonLink }", "import { ButtonLink }")
  return s
 rw(f,queue)
