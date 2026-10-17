from pathlib import Path
r=Path(__file__).resolve().parents[2]
old=r/'frontend/src/features/account/components/dashboard.module.css';new=r/'frontend/src/components/layout/workspace-dashboard.module.css';new.write_text(old.read_text(encoding='utf-8'),encoding='utf-8');old.unlink()
p=r/'frontend/src/components/domain/panel.tsx';s=p.read_text(encoding='utf-8').replace('@/features/account/components/dashboard.module.css','@/components/layout/workspace-dashboard.module.css');p.write_text(s,encoding='utf-8')
p=r/'frontend/src/app/admin/visao/office.tsx';s=p.read_text(encoding='utf-8').replace("import { Button } from '@/components/ui/button'", "import { Button } from '@/components/ui/button'\nimport { Field, Select } from '@/components/ui/input'\nimport { WorkspaceSection, ComparisonBars } from '@/components/layout/workspace-section'\nimport styles from '@/components/layout/workspace-dashboard.module.css'")
a=s.index('  const gloss =');b=s.index('      <div className="office-body">',a)
s=s[:a]+'''  return (
    <div className={styles.dashboard}>
      <div className={styles.toolbar}>
        <Field label="Área de gestão"><Select value={section} onChange={event => setSection(event.target.value as SectionId)}>{SECTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
        <p>{SECTIONS.find(item => item.id === section)?.gloss}</p>
      </div>
'''+s[b:]
s=s.replace('''        Uma seção por vez. Impressões e cliques são dos últimos {office?.windowDays ?? 30} dias. Receita é o total já pago. Contas e links mostram no máximo {office?.listCap ?? 40}; a busca acha o restante.''','''        {section === 'contas' || section === 'links' ? `Até ${office?.listCap ?? 40} resultados. Use a busca para encontrar outros.` : `Impressões e cliques: últimos ${office?.windowDays ?? 30} dias. Receita: total já pago.`}''')
a=s.index('            <section className="office-metrics"');b=s.index("          {section === 'cliques'",a)
s=s[:a]+'''            <div className={styles.dashboard}>
              <dl className={styles.metrics} aria-label="Métricas">
                <div><dt>Contas</dt><dd>{count(office.metrics.users)}</dd><small>{count(office.metrics.bannedUsers)} suspensas</small></div>
                <div><dt>Links publicados</dt><dd>{count(office.metrics.publishedLinks)}</dd><small>{count(office.metrics.pendingLinks)} na fila</small></div>
                <div><dt>Cliques no catálogo</dt><dd>{count(office.metrics.clicks)}</dd><small>{count(office.metrics.impressions)} impressões · {percent(office.metrics.ctr)}</small></div>
                <div><dt>Receita confirmada</dt><dd>{formatCents(office.metrics.paidCents)}</dd><small>{count(office.metrics.paidOrders)} pedidos pagos</small></div>
              </dl>
              <div className={styles.columns}>
                <WorkspaceSection title="Publicação no catálogo" description="Quantidade de links por situação.">
                  <ComparisonBars rows={Object.entries(office.linkStatusCounts).map(([id,value]) => ({id,label:LINK_STATUS[id] ?? id,value}))} unit="links" />
                </WorkspaceSection>
                <WorkspaceSection title="Próximas ações">
                  <ul className={styles.tasks}><li><a href="/admin/moderacao">Revisar envios →</a><span>{count(office.metrics.pendingLinks)} links aguardando revisão</span></li><li><a href="/admin/denuncias">Conferir denúncias →</a><span>Analise os relatos recebidos.</span></li><li><a href="/admin/disponibilidade">Ver correções →</a><span>Convites atualizados pelos responsáveis.</span></li><li><a href="/admin/estornos">Acompanhar estornos →</a><span>Devoluções e tentativas de pagamento.</span></li></ul>
                </WorkspaceSection>
              </div>
            </div>
          ) : null}

'''+s[b:]
s=s.replace('<div className="office-body">','<div className={styles.dashboard}>')
s=s.replace('<form className="office-search"','<form className={styles.toolbar}')
# Add distinct presentation boundary around reports without touching their calculation/transport.
s=s.replace("{section === 'retencao' ? <RetentionPanel /> : null}","{section === 'retencao' ? <WorkspaceSection title=\"Retenção de dados\"><RetentionPanel /></WorkspaceSection> : null}")
s=s.replace("{section === 'trafego' ? <TrafficPanel /> : null}","{section === 'trafego' ? <WorkspaceSection title=\"Tráfego e conversão\"><TrafficPanel /></WorkspaceSection> : null}")
s=s.replace("{section === 'financeiro' ? <FinancePanel /> : null}","{section === 'financeiro' ? <WorkspaceSection title=\"Resultados financeiros\"><FinancePanel /></WorkspaceSection> : null}")
p.write_text(s,encoding='utf-8')
# Update the actual journey interaction; keep all assertions of publication/payment safety.
p=r/'frontend/e2e/admin-promotions.spec.ts';s=p.read_text(encoding='utf-8').replace("await page.getByRole('navigation', { name: 'Seções', exact: true }).getByRole('button', { name: /^Links(?: |$)/ }).click()","await page.getByLabel('Área de gestão', { exact: true }).selectOption('links')");p.write_text(s,encoding='utf-8')
