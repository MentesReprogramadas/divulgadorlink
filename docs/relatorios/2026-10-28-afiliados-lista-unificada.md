# Ofertas de todos os termos na mesma lista

Pedido: remover seletor por termo e misturar resultados. Alteração no workspace existente `C:/VSCODE/temlink-afiliados`, sem branch, commit, dependência, migration ou publicação.

O painel consulta o modo MIXED da descoberta: reúne páginas coletadas nas últimas 24 horas da própria segmentação/tenant, conserva a cotação mais recente de cada anúncio e intercala os termos. Decisões de descarte/envio e filtros de avaliação são aplicados antes da paginação de 20 resultados. A última página é ajustada quando a quantidade cai. O total representa os resultados reunidos da avaliação, não milhares de fichas ainda não consultadas no ML. O termo permanece apenas na evidência do produto.

Anterior/Próxima consulta a lista combinada via GET, sem agendar busca por termo. Atualização forçada solicita o ciclo automático seguinte, preservando limites/leases. Prévia, envio, descarte e restauração mantêm os contratos anteriores. As rotas de páginas da fonte continuam compatíveis com os consumidores internos existentes.

Verificado: 79 testes frontend da área e 16 testes backend descoberta/HTTP passaram; lint, typecheck e build de ambos os pacotes passaram. Playwright Test: 12/12 cenários desktop/mobile passaram, incluindo paginação por GET sem seletor nem POST por termo. Playwright MCP isolado com dados reais confirmou resposta200, produtos dos seis termos na primeira página combinada, ausência de select, página2 de A revisar e mobile390px sem overflow. Nenhuma oferta foi enviada nesta validação. Graphify incremental code-only: 8519 nós/30702 relações, sem LLM/API ou envio de código.

Limite: a lista contém produtos efetivamente coletados, não todo o catálogo do Mercado Livre. A consulta reaproveita o limite existente de 500 páginas recentes; novas coletas alimentam a lista. Não há embaralhamento aleatório a cada render: a alternância de termos preserva navegação previsível.

Reversão: restaurar apenas os deltas deste ajuste em discovery backend/painel frontend e seus testes. Não apagar dados ou reverter o trabalho anterior.
