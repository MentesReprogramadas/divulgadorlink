# SEO profissional — entrega de 26/10/2026

## Escopo

SEO público no servidor para redes, nichos, coleções editoriais por intenção e anúncios individuais. Pesquisa e fontes em [palavras-chave](../pesquisas/2026-10-26-pesquisa-palavras-chave-redes-nichos.md). Adulto e apostas têm prioridade editorial; as demais redes e categorias usam a mesma infraestrutura.

Catálogo, detalhes e sitemap compartilham elegibilidade real. Páginas vazias, filtros e rascunhos não passam a indexar apenas por receber texto. Títulos, descrição, canonical, breadcrumbs, paginação HTML e classificação sexual respeitam a representação pública. Apostas não recebem classificação sexual somente por exigirem idade.

O painel permite revisar textos de redes/nichos, criar coleções, selecionar anúncios e aprovar uma prévia pública individual. A alteração do anúncio invalida sua prévia; conteúdo restrito, convites e mídia não são enviados em HTML/RSC anônimo. Configuração por tenant, controle concorrente e auditoria usam estruturas existentes, sem migration ou dependência nova.

## Evidências locais

- Revisão independente de código concluída. Duas correções verificadas com testes que falharam antes e passaram depois: paginação anônima de previews adultos e propagação da classificação editorial sexual.
- Cópia isolada da entrega sobre `origin/main`: 731 testes backend e 793 frontend passaram (incluindo três regressões adicionais de salvamento). A árvore de trabalho mais ampla também passou em 836 testes frontend antes dessas correções complementares.
- 19 testes PostgreSQL passaram, incluindo concorrência, rollback e catálogo. Nova jornada de curadoria com IDs selecionados exercitou PostgreSQL no navegador.
- Playwright SEO: 14 testes passaram em desktop e mobile, cobrindo idade, metadados, sitemap, paginação, invalidação e autorização administrativa.
- Regressões do catálogo e aceite paginado após mudança de títulos: 4 testes passaram na cópia isolada, desktop/mobile. Proteções de deploy e lock E2E: 9 testes passaram.
- Lint, typecheck e builds locais frontend/backend passaram. Evidências detalhadas em `output/seo-*.log`; esse diretório não integra a entrega.
- Capturas públicas e administrativas inspecionadas; overflow do editor em ampliação corrigido. Teste de ampliação usa CSS zoom 200%, além de viewport de 320px; não equivale a todos os dispositivos reais.
- Quatro baselines administrativas revisadas e repetição sem atualização: Windows desktop/mobile 2/2 e Chromium Linux 1.63 desktop/mobile 2/2 passaram, incluindo Axe e overflow. Nenhuma tolerância alterada.
- Graphify atualizado incrementalmente, inclusive após as correções complementares: 9514 nós e 35635 relações. O grafo cobre também trabalho concorrente, portanto não foi incluído no release de SEO.

Na primeira CI da entrega, 19 checks passaram e três regressões impediram o deploy: dois cenários de overflow e uma corrida de salvamento. O título da home estava em uma linha forçada; o diagnóstico Linux mediu texto até 322px em viewport de 320px. A quebra natural corrigiu o teste masonry completo nas cinco larguras. No editor de perfil, um timer de autosave agendado antes da falha de salvamento explícito não reavaliava a proteção contra repetição. A proteção agora também é verificada no callback; testes provam que retry manual, evento online e novas edições continuam salvando. Nenhuma asserção foi enfraquecida.

As três regressões originais passaram individualmente no Chromium Linux 1.63 depois das correções: catálogo masonry, descoberta em 320px com fonte 200% e recuperação manual de tradução. Capturas e traces foram inspecionados, incluindo confirmação do clique real no retry. Revisão independente dessas duas correções sem achados confirmados. Lint, tipos, build e os 793 testes frontend da cópia isolada passaram novamente.

## Publicação e limites

Operação em `/admin/configuracoes`, seção “SEO de páginas e coleções”:

1. Revisar a prévia pública de cada anúncio restrito pelo seu ID. Usar descrição fiel, indicar conteúdo sexual explícito quando aplicável e aprovar somente após revisar. Editar o anúncio depois exige nova revisão.
2. Criar seleções úteis com rede, nicho e, opcionalmente, IDs específicos: por exemplo, Telegram + Adulto, Telegram + Apostas ou WhatsApp + Compras/Ofertas. Definir um endereço estável e texto próprio para a intenção; a URL será `/descobrir/endereco`.
3. Aprovar a página somente com inventário elegível. Publicações vazias/rascunhos não entram no sitemap. Evitar várias páginas com a mesma seleção e pequenas trocas de palavras.

Usuário autorizou produção. A entrega usa somente seus arquivos sobre a main, preservando o checkout e alterações concorrentes. Nenhum anúncio real recebe aprovação editorial automática. Adultos só entram no sitemap com prévia pública atual e aprovada; coleções dependem de curadoria e inventário elegível.

SEO técnico não garante primeiro lugar, indexação ou prazo do Google. Não foi comprovada indexação no Search Console nem aumento de tráfego. Reversão do código: republicar o commit anterior nas aplicações API, worker e web; preservar os dados editoriais Config e seu histórico de auditoria.
