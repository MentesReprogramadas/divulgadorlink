const fs=require('node:fs')
const edits={
 'frontend/src/app/admin/estornos/page.tsx': [['cLL','ALL'],['crray','Array'],['name="next"','name="payment"']],
 'frontend/src/app/admin/planos/editor.tsx': [['Plano salvo. c próxima','Plano salvo. A próxima'],['name="next"','name="grip"']],
 'frontend/src/app/admin/visao/retention-panel.tsx': [['worker. c contagem','worker. A contagem'],['name="next"','name="trash"']],
 'frontend/src/app/admin/visao/office.tsx': [['LINK_ST<TUSES','LINK_STATUSES'],['<ActionIcon name="next" />Suspender','<ActionIcon name="shield" />Suspender']],
 'frontend/src/features/administration/components/link-promotion-editor.tsx': [['name="next"','name="star"']],
 'frontend/src/features/account/components/workspace.module.css': [['.content { min-width: 0; display: grid; gap: var(--space-8);','.content { min-width: 0; display: grid; gap: var(--space-6);']],
 'frontend/src/features/promotions/components/performance-report.tsx': [['name="next"','name="filter"']],
 'frontend/src/features/moderation/report-queue.tsx': [['<ActionIcon name="next" />Aplicar filtros','<ActionIcon name="filter" />Aplicar filtros'],['<a href="/admin/denuncias">Limpar filtros</a>','<ButtonLink variant="secondary" href="/admin/denuncias"><ActionIcon name="close" />Limpar filtros</ButtonLink>']],
 'frontend/src/app/admin/visao/finance-panel.tsx': [['<ActionIcon name="next" />Aplicar','<ActionIcon name="filter" />Aplicar']],
 'frontend/src/features/availability/availability-screen.tsx': [['<ActionIcon name="next" />Corrigir link','<ActionIcon name="edit" />Corrigir link']],
 'frontend/src/components/domain/panel-links.tsx': [['<ActionIcon name="next" />Disponibilidade','<ActionIcon name="clock" />Disponibilidade']],
 'frontend/src/features/account/components/area-frame.tsx': [['<ActionIcon name="next" />Gerenciar links','<ActionIcon name="link" />Gerenciar links']],
 'frontend/src/features/favorites/favorites-screen.tsx': [['<ActionIcon name="next" />Mais favoritos','<ActionIcon name="down" />Mais favoritos']],
 'frontend/src/features/redirects/redirect-screen.tsx': [['<ActionIcon name="next" />Filtrar acessos','<ActionIcon name="filter" />Filtrar acessos'],['<ActionIcon name="next" />Desativar endereço','<ActionIcon name="close" />Desativar endereço']],
 'frontend/src/app/painel/links/[id]/destaque/page.tsx': [['<ActionIcon name="next" />Pagar','<ActionIcon name="payment" />Pagar']],
 'frontend/src/components/domain/evolution-integration.tsx': [['<ActionIcon name="next" />{data.enabled','<ActionIcon name="bell" />{data.enabled'],['<ActionIcon name="next" />{data.actionsEnabled','<ActionIcon name="settings" />{data.actionsEnabled'],['<ActionIcon name="next" />{bound','<ActionIcon name="shield" />{bound'],['<ActionIcon name="next" />Reprocessar entrega','<ActionIcon name="refresh" />Reprocessar entrega']],
}
for(const [file,pairs] of Object.entries(edits)){let source=fs.readFileSync(file,'utf8');for(const [before,after]of pairs)source=source.replaceAll(before,after);fs.writeFileSync(file,source)}
