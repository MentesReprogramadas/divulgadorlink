from pathlib import Path
p=Path('C:/VSCODE/divulgadorlinks/frontend/src/components/domain/evolution-integration.tsx');s=p.read_text(encoding='utf-8')
s=s.replace("import { ErrorState }", "import { WorkspaceActions } from '@/components/layout/workspace-controls'\nimport { WorkspaceSection } from '@/components/layout/workspace-section'\nimport { RefreshButton } from '@/components/layout/workspace-actions'\nimport { EmptyState } from '@/components/feedback/empty-state'\nimport styles from './evolution-integration.module.css'\nimport { ErrorState }",1)
start=s.index('    <div className="page-header-actions">');end=s.index('    <h3>Operadores autorizados</h3>',start)
actions=s[start:end].replace('<div className="page-header-actions">','<WorkspaceActions>').replace('</div>','</WorkspaceActions>').replace('<Button variant="ghost" disabled={busy} onClick={() => void load()}>Atualizar estado</Button>','<RefreshButton label="Atualizar estado" disabled={busy} onClick={() => void load()} />')
s=s[:start]+s[end:]
s=s.replace('return <section aria-labelledby="evolution-title">\n    <h2 id="evolution-title">Avisos e moderação pelo WhatsApp</h2>\n    <p>As decisões usam as mesmas regras do painel. Apenas operadores vinculados a uma conta administradora ativa podem aprovar ou recusar.</p>', 'return <section className={styles.page} aria-label="Integração WhatsApp">\n'+actions+'    <WorkspaceSection title="Avisos e moderação pelo WhatsApp">')
s=s.replace('<dl><dt>Configuração</dt>', '<dl className={styles.details}><dt>Configuração</dt>')
s=s.replace('    <h3>Operadores autorizados</h3>', '    </WorkspaceSection>\n    <WorkspaceSection title="Operadores autorizados">')
s=s.replace('Conexão da instância:', 'Conexão:').replace('. Use Atualizar estado para consultar novamente.', '.')
s=s.replace('<p>Nenhum número autorizado no servidor.</p>', '<EmptyState />').replace(' : <ul>{data.allowedPhones', ' : <ul className={styles.operators}>{data.allowedPhones')
s=s.replace('    <h3>Histórico de entregas</h3>', '    </WorkspaceSection>\n    <WorkspaceSection title="Histórico de entregas">')
s=s.replace('<p>Nenhuma entrega registrada.</p>','<EmptyState />')
s=s.replace('  </section>\n}', '    </WorkspaceSection>\n  </section>\n}')
p.write_text(s,encoding='utf-8')
for file in ['finance-panel.tsx','traffic-panel.tsx']:
 p=Path('C:/VSCODE/divulgadorlinks/frontend/src/app/admin/visao')/file;s=p.read_text(encoding='utf-8');s=s.replace("import { ErrorState }", "import { EmptyState } from '@/components/feedback/empty-state'\nimport { ErrorState }",1)
 import re
 s=re.sub(r'<p>Nenhum[a]? [^<]*</p>','<EmptyState />',s)
 p.write_text(s,encoding='utf-8')
