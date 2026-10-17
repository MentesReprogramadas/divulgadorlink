from pathlib import Path
r=Path(__file__).resolve().parents[2]
p=r/'frontend/src/components/domain/panel-links.tsx';s=p.read_text(encoding='utf-8').replace("{ Field, Input }","{ Field, Input, Select }").replace("import { api } from '@/lib/api'","import { api } from '@/lib/api'\nimport styles from '@/components/layout/workspace-dashboard.module.css'")
s=s.replace("  const [page, setPage] = useState(1)","  const [page, setPage] = useState(1)\n  const [query, setQuery] = useState('')\n  const [network, setNetwork] = useState('ALL')\n  const [sort, setSort] = useState('name')")
s=s.replace("  const matched = links.filter(FILTERS.find((item) => item.id === filter)?.match ?? (() => true))", """  const matched = links.filter(FILTERS.find((item) => item.id === filter)?.match ?? (() => true))
    .filter(link => (network === 'ALL' || link.network?.name === network) && `${link.name} ${link.description ?? ''} ${link.niche?.name ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim()))
    .sort((a,b) => sort === 'clicks' ? (stats[b.id]?.clicks ?? -1) - (stats[a.id]?.clicks ?? -1) : a.name.localeCompare(b.name, 'pt-BR'))""")
a=s.index('      <div className="filter-row"');b=s.index('      {visible.length === 0',a)
s=s[:a]+'''      <div className={styles.toolbar} role="search" aria-label="Filtrar links">
        <Field label="Buscar nos meus links"><Input type="search" value={query} placeholder="Nome, descrição ou categoria" onChange={event => { setQuery(event.target.value); setPage(1) }} /></Field>
        <Field label="Situação do link"><Select value={filter} onChange={event => choose(event.target.value as FilterId)}>{FILTERS.map(item => <option key={item.id} value={item.id}>{item.label} ({links.filter(item.match).length})</option>)}</Select></Field>
        <Field label="Rede"><Select value={network} onChange={event => { setNetwork(event.target.value); setPage(1) }}><option value="ALL">Todas as redes</option>{Array.from(new Set(links.flatMap(link => link.network?.name ? [link.network.name] : []))).sort().map(name => <option key={name} value={name}>{name}</option>)}</Select></Field>
        <Field label="Ordenar por"><Select value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}><option value="name">Nome</option><option value="clicks">Mais cliques</option></Select></Field>
        <Button variant="secondary" onClick={() => { setQuery(''); setNetwork('ALL'); setSort('name'); choose('all') }}>Limpar filtros</Button>
      </div>
      <p className={styles.result} role="status">{matched.length} de {links.length} links encontrados</p>
'''+s[b:];p.write_text(s,encoding='utf-8')
p=r/'frontend/src/app/admin/moderacao/queue.tsx';s=p.read_text(encoding='utf-8').replace("import { api } from '@/lib/api'","import { api } from '@/lib/api'\nimport { Field, Input, Select } from '@/components/ui/input'\nimport styles from '@/components/layout/workspace-dashboard.module.css'")
s=s.replace("  const [pending, setPending]", "  const [query, setQuery] = useState('')\n  const [source, setSource] = useState('ALL')\n  const [pending, setPending]")
s=s.replace("  const visibleCases = linkId ? cases.filter(row => row.linkId === linkId) : cases", """  const visibleCases = (linkId ? cases.filter(row => row.linkId === linkId) : cases).filter(row =>
    (source === 'ALL' || row.source === source) && `${row.name} ${row.url} ${row.ownerName} ${row.ownerEmail} ${row.niche} ${row.network}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim()))""")
s=s.replace('''    <>
      {linkId''','''    <>
      <div className={styles.toolbar} role="search" aria-label="Filtrar fila de moderação">
        <Field label="Buscar na fila"><Input type="search" value={query} placeholder="Link, responsável ou categoria" onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Origem da revisão"><Select value={source} onChange={event => setSource(event.target.value)}><option value="ALL">Todas as origens</option>{Array.from(new Set(cases.map(row => row.source))).map(value => <option key={value} value={value}>{SOURCE[value] ?? value}</option>)}</Select></Field>
        <Button variant="secondary" onClick={() => { setQuery(''); setSource('ALL') }}>Limpar filtros</Button>
      </div>
      {ready && !failed ? <p role="status">{visibleCases.length} casos na fila carregada</p> : null}
      {linkId''')
s=s.replace("{linkId ? 'Este link não tem uma revisão aberta.' : 'Nenhum caso aberto'}","{query || source !== 'ALL' ? 'Nenhum caso corresponde aos filtros.' : linkId ? 'Este link não tem uma revisão aberta.' : 'Nenhum caso aberto'}")
s=s.replace('<h2>{row.name}</h2>','<h2>{row.name}</h2><h3>Conteúdo enviado</h3>')
s=s.replace('{place ? <p className="panel-meta">{place}</p> : null}', '{place ? <p className="panel-meta"><strong>Rede e categoria:</strong> {place}</p> : null}').replace('{owner ? <p className="panel-meta">{owner}</p> : null}', '{owner ? <p className="panel-meta"><strong>Responsável:</strong> {owner}</p> : null}')
p.write_text(s,encoding='utf-8')
p=r/'frontend/src/components/domain/panel.tsx';s=p.read_text(encoding='utf-8');needle='''  if (!ready)
    return (
      <p role="status" aria-label="Carregando">
        Carregando
      </p>
    );''';a=s.index('export function OrdersArea()');part=s[a:];part=part.replace(needle,'''  const filteredOrders = orders.filter(order => (status === "ALL" || order.status === status) && `${order.id} ${links.find(link => link.id === order.linkId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim()));
'''+needle);expr='orders.filter(order => (status === "ALL" || order.status === status) && `${order.id} ${links.find(link => link.id === order.linkId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim()))';start=part.index('  return (',part.index('const filteredOrders'));part=part[:start]+part[start:].replace(expr,'filteredOrders');s=s[:a]+part;p.write_text(s,encoding='utf-8')
