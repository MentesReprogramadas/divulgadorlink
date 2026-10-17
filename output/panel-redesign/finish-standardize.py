from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks/frontend/src')
# Shared actions and filters replace only known task toolbars; preserve handlers.
for folder,file in [('moderation','report-queue'),('availability','url-proposal-queue')]:
 p=root/f'features/{folder}/{file}.tsx';s=p.read_text(encoding='utf-8')
 s=s.replace("import { ErrorState }", "import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'\nimport { EmptyState } from '@/components/feedback/empty-state'\nimport { ErrorState }",1)
 import re
 s=re.sub(r'    <header><p className=\{styles.note\}>.*?</p></header>\n','',s)
 if folder=='moderation':
  s=s.replace('<form className={styles.filters} method="get" aria-label="Filtrar denúncias">','<WorkspaceFilters method="get" id="report-filters" label="Filtrar denúncias">').replace('        <Button type="submit">Aplicar filtros</Button>\n','').replace('      </form>','      </WorkspaceFilters>')
  start=s.index('      <div className={styles.actions}>');end=s.index('</div>',start)+6
  actions=s[start:end].replace('<div className={styles.actions}>','<WorkspaceActions><Button type="submit" form="report-filters">Aplicar filtros</Button>').replace('</div>','</WorkspaceActions>')
  s=s[:start]+s[end:];s=s.replace('      <WorkspaceFilters',actions+'\n      <WorkspaceFilters',1)
 else:
  s=s.replace('<div className={styles.actions}><Button type="button" variant="secondary" disabled={state.kind === \'loading\'}','<WorkspaceActions><Button type="button" variant="secondary" disabled={state.kind === \'loading\'}').replace('Início da fila</a> : null}</div>','Início da fila</a> : null}</WorkspaceActions>')
  s=s.replace('WorkspaceActions, WorkspaceFilters','WorkspaceActions')
 s=s.replace('<p>Nenhuma denúncia neste filtro.</p>','<EmptyState />').replace('<p>Nenhuma correção aguardando análise.</p>','<EmptyState />')
 p.write_text(s,encoding='utf-8')
# Remove redundant page introductions; actionable form hints and warnings remain.
for f in ['app/admin/moderacao/page.tsx','app/admin/planos/page.tsx','app/painel/conta/page.tsx']:
 p=root/f;s=p.read_text(encoding='utf-8');s=re.sub(r'<p className="panel-section-description">.*?</p>','',s);p.write_text(s,encoding='utf-8')
# Native selects in financial filters use the same custom component.
p=root/'app/admin/visao/finance-panel.tsx';s=p.read_text(encoding='utf-8').replace('<select className="field"','<Select').replace('</select>','</Select>')
s="import { Select } from '@/components/ui/input'\n"+s if not s.startswith("'use client'") else s.replace("'use client'", "'use client'\nimport { Select } from '@/components/ui/input'",1)
p.write_text(s,encoding='utf-8')
