# Ofertas: menos espera, classificação correta e hierarquia

Pedido: investigar paginação lenta e poucos produtos, corrigir descartes por preço, simplificar a tela com cards liquidglass. Workspace existente `C:/VSCODE/temlink-afiliados`, sem branch, commit, publicação ou nova dependência.

## Causas confirmadas e correções

1. O painel aguardava `/catalog/status` antes de montar a descoberta, mesmo com produtos já coletados. Medição local: GETs de páginas em 50/70/77ms, contra 5811ms para status da integração. Descoberta e integração agora carregam em paralelo, sem remontar os produtos quando o status responde. Ações de prévia aguardam integração conhecida/configurada; a API continua autorizando cada operação.
2. A entrada mostrava somente SELECTED: sete produtos. Vinte e um anúncios com preço atual válido estavam em REVIEW e ficavam escondidos. Produtos agora mostra ambos por padrão; falta de histórico, desconto anterior ou reputação não vira preço atual inválido. Na validação seguinte, nova coleta trouxe total29. Não se inferiu cobertura de todo o ML.
3. Fichas sem anúncio retornado pelo catálogo eram contadas como descartadas e recebiam motivo genérico de preço inválido. Respostas reais de duas fichas devolveram404; outra devolveu preço15.07 BRL/new. A classificação agora distingue sem anúncios, fora dos critérios, preço atual indisponível e falha de consulta. Erro de consulta é não avaliado. Indisponíveis técnicos ficam somente no diagnóstico em Configurações, separados dos descartes reais; fichas antigas sem classificação recebem motivo neutro até nova coleta.
4. `original_price` com formato inválido eliminava anúncio com preço atual válido. Esse campo agora é tratado como evidência opcional desconhecida; preço anterior/desconto ficam ausentes. O preço atual continua sujeito às mesmas validações monetárias, sem conversão permissiva de strings, moedas ou frações inválidas.
5. Reputação de vendedores era consultada individualmente depois de cada comparação, através de uma ponte com custo remoto por chamada. Agora vendedores distintos são deduplicados e consultados em lotes de até10, dois lotes simultâneos; fallback mantém duas consultas paralelas. Preço continua sendo escolhido apenas após comparação completa. Falhas401/403/409/413/429 interrompem tanto busca quanto revalidação da prévia; não viram reputação presumida.

## Interface e navegação

Três áreas: Produtos, Descartados e Configurações. Cards usam LiquidLens existente, com foto, nome, preço, badge e uma ação principal. Evidências, descarte e link externo ficam juntos nos detalhes do produto. Busca manual, contas/sessões, termos e diagnóstico ficam em Configurações. O stepper completo deixa de ocupar a aba Ofertas quando a preparação já terminou; permanece para quem precisa configurar.

Todos os termos continuam juntos e sem anúncios repetidos. Paginação por GET consulta a lista já coletada; cache local permite reaproveitar páginas durante a montagem do componente. Produtos anteriores permanecem visíveis na atualização; ações sobre dados antigos ficam bloqueadas até resposta atual. Descarte/envio invalidam cache. Contador e barra compacta preservam agendamento real; atualização forçada fica em Configurações.

Medição real de interação após mudanças: produtos visíveis em1872ms ao abrir Ofertas e página2 em181ms. São observações locais, não benchmark nem promessa para outras redes/provedores.

## Verificações

- Backend: 185 arquivos/862 testes passaram na rodada global final com PostgreSQL/Redis descartáveis de regressão. Lint, typecheck e build passaram. Testes novos cobrem classificação, preço anterior inválido, lotes/deduplicação de vendedor, falhas de autorização e separação de disponíveis/descartados/indisponíveis, incluindo exclusão de enviados.
- Frontend: 226 arquivos/908 testes passaram; lint, typecheck app/E2E e build passaram. Após preservar a barra compacta, os18 testes de descoberta, lint/tipos/build foram repetidos. Testes incluem integração pendente sem bloquear produtos, mesma subtree, cache de paginação, ações antigas bloqueadas e prévia indisponível sem sessão.
- Playwright Test:12/12 cenários UI desktop/mobile e4/4 integrações com API/PostgreSQL/provedor loopback passaram. Confirmação envia somente ao stub; criação de segmentação inicia coleta automaticamente; cancelar não persiste oferta; histórico permanece após reload.
- Playwright MCP isolado com dados reais: lista unificada, próxima página, configurações apartadas, card mobile390px sem overflow, link real e prévia conferida; Escape cancela e retorna foco à ação. Nenhum botão Enviar real foi acionado.
- Revisão independente confirmou correções de propagação de autorização e bloqueio da prévia sem sessão, e coerência das contagens MIXED. Sem novo achado material; revisão estática não substitui execução.
- `git diff --check` passou. Graphify incremental code-only, sem LLM/API ou envio externo de código. Sem migration nova; configuração privada permaneceu ignorada. API3351 e worker locais reiniciados para carregar as correções; worker sem entregas/coletores ativos no momento do reinício.

## Fontes e limites

[Buscador oficial do ML](https://developers.mercadolivre.com.br/buscador-de-produtos) confirma que fichas de catálogo e anúncios compráveis são entidades distintas; o filtro status=active já existia e foi preservado. Consulta real com filtro confirmou fichas ativas; isso não garantiu anúncio disponível em todos os endpoints de vendedores. Nenhum filtro permissivo, preço inventado ou contorno de403 foi usado para inflar resultados.

Dados históricos continuam começando nas observações desta operação. O catálogo autenticado consultado não é o catálogo inteiro do marketplace; fichas sem anúncio podem continuar existindo. O ganho medido de navegação não torna a cotação/geração de link remota instantânea. Cache de navegação dura somente enquanto o painel permanece montado.

Reversão: retirar somente os deltas desta etapa nos componentes, descoberta e adapter/domínio; manter dados, contas, grupos e histórico. Banco/Redis/servidor de regressão são separados da operação local e removidos após os testes. Nenhum WhatsApp real foi enviado nesta validação.
