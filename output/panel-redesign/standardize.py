from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks/frontend/src')
def load(f): return (root/f).read_text(encoding='utf-8')
def save(f,s): (root/f).write_text(s,encoding='utf-8')
f='app/admin/visao/office.tsx';s=load(f)
s=s.replace("import { Field, Select }", "import { Field, Input, Select }")
s=s.replace("import { AdminLinksBoard,", "import { LINK_STATUSES, AdminLinksBoard,")
s=s.replace("import styles from", "import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'\nimport { RefreshButton } from '@/components/layout/workspace-actions'\nimport { EmptyState } from '@/components/feedback/empty-state'\nimport styles from",1)
start=s.index('      <div className={styles.areaSwitch}>');end=s.index('      <div className={styles.dashboard}>',start)
s=s[:start]+'''      <WorkspaceActions>
        <RefreshButton onClick={() => void load(q)} />
        {section === 'contas' || section === 'links' ? <><Button type="submit" form="office-filters">Buscar</Button><Button variant="secondary" onClick={() => { setDraft(''); setQ(''); setLinkStatus('ALL') }}>Limpar busca</Button></> : null}
      </WorkspaceActions>
      <WorkspaceFilters id="office-filters" label="Filtrar gestão" onSubmit={event => { event.preventDefault(); setQ(draft.trim()) }}>
        <Field label="Área de gestão"><Select value={section} onChange={event => setSection(event.target.value as SectionId)}>{SECTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
        {section === 'contas' || section === 'links' ? <Field label="Buscar contas e links"><Input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Nome, e-mail ou link" /></Field> : null}
        {section === 'links' ? <Field label="Situação dos links"><Select value={linkStatus} onChange={event => setLinkStatus(event.target.value as AdminLinkFilter)}><option value="ALL">Todos</option>{LINK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.filter}</option>)}</Select></Field> : null}
      </WorkspaceFilters>
'''+s[end:]
start=s.index('      <p className="office-note">');end=s.index('      {failed || !office',start);s=s[:start]+s[end:]
start=s.index("          {section === 'contas' || section === 'links' ? (");end=s.index('          {notice &&',start);s=s[:start]+s[end:]
s=s.replace('<p>Nenhum clique no período.</p>','<EmptyState />').replace('<p>Nenhum pagamento confirmado.</p>','<EmptyState />').replace('<p>Nenhuma conta.</p>','<EmptyState />')
s=s.replace(' counts={office.linkStatusCounts} filter={linkStatus} onFilterChange={setLinkStatus}', '')
s=s.replace(' loading={loading} query={q}', ' loading={loading}')
save(f,s)
f='features/administration/components/admin-links-board.tsx';s=load(f)
s=s.replace("import Link from", "import { EmptyState } from '@/components/feedback/empty-state'\nimport { Loading } from '@/components/feedback/loading'\nimport Link from",1)
start=s.index('  counts: Record<');end=s.index('  onWithdraw:',start);s=s[:start]+s[end:]
s=s.replace('  query: string\n','').replace('{ links, counts, filter, onFilterChange, onWithdraw, loading, query }','{ links, onWithdraw, loading }')
start=s.index('  const total =');end=s.index('  return (',start);s=s[:start]+s[end:]
start=s.index('      <div className={styles.heading}>');end=s.index('      <div className={styles.grid}',start);s=s[:start]+'''      {loading ? <Loading /> : null}
'''+s[end:]
s=s.replace('<p className={styles.empty}>Nenhum link encontrado neste status{query ? \' para esta busca\' : \'\'}.</p>','<EmptyState />')
save(f,s)
f='app/admin/estornos/page.tsx';s=load(f).replace("import styles from '@/components/layout/workspace-dashboard.module.css'", "import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'")
s=s.replace('      <p className="panel-section-description">Confira solicitações e falhas antes de registrar uma resolução.</p>\n','')
s=s.replace('      {rows && rows.length === 0 && !error ? <EmptyState>Nenhum estorno</EmptyState> : null}\n','')
action='<Button variant="secondary" onClick={() => { setQuery(\'\'); setStatus(\'ALL\') }}>Limpar filtros</Button>'
s=s.replace('{rows ? <><div className={styles.toolbar} role="search" aria-label="Filtrar estornos">', '{rows ? <><WorkspaceActions>'+action+'</WorkspaceActions><WorkspaceFilters label="Filtrar estornos">')
s=s.replace(action+'</div><p role="status">{visible.length} de {rows.length} estornos encontrados</p>','</WorkspaceFilters>')
s=s.replace("{rows && rows.length > 0 && !visible.length ? <EmptyState>Nenhum estorno corresponde aos filtros.</EmptyState> : null}","{rows && !visible.length && !error ? <EmptyState /> : null}")
save(f,s)
