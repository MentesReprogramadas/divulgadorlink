# Natal: diagnóstico do funil e conversões reais

Investigação somente leitura em 29/10/2026. Não foram ativados webhooks, enviados eventos à Meta ou alterados anúncios e orçamento.

## Evidências

- Campanha OUTCOME_TRAFFIC, otimização LANDING_PAGE_VIEWS. Destino direto no convite `/ofertas/entrar/natal`; não passa pela LP do subdomínio.
- Primeiro snapshot Meta: 99 cliques de saída e 43 visualizações. Posterior: 124 cliques e 56 visualizações. São instantes distintos, não uma coorte de pessoas identificadas.
- Snapshot próprio posterior: 43 visitas, 18 encaminhamentos automáticos, um clique/encaminhamento por botão. Encaminhamento é registrado antes da navegação e não comprova abertura nativa ou ingresso.
- Grupo com quatro membros no snapshot. Sem histórico confiável de eventos add/remove, esse saldo não comprova ausência de ingressos: podem existir entradas seguidas de saídas.
- Acompanhamento posterior: 51 visitas e 26 encaminhamentos automáticos, um clique/encaminhamento por botão. Grupo ainda com quatro membros. Esses números não permitem calcular uma taxa individual de ingresso.
- 18 requisições recentes de join nos logs responderam HTTP 200. A amostra inclui potencial tráfego diagnóstico; não representa 18 participantes do anúncio.
- Criativo usa imagem de presentes genéricos, sem exemplos verificáveis de produtos/preços. Texto pintado diz “Saiba mais”, CTA reportado pela Meta é SEE_DETAILS (“Ver detalhes”).
- LP inspecionada em contexto isolado 390×844, POSTs e analytics externos bloqueados: título “Achadinhos de Natal”, um botão “Entrar no grupo”, link para o convite; largura do documento 390px. Alterar essa LP isoladamente não afeta o anúncio atual, que a ignora.

## Hipóteses a testar, não causas comprovadas

1. Handoff do navegador do Instagram para WhatsApp: reproduzir no Android real pelo CTA do anúncio. Emulação até o URL não valida abertura do aplicativo.
2. Objetivo atual compra carregamentos de página; não sinaliza ao algoritmo quem efetivamente entra e permanece no grupo.
3. Falta de evidência concreta de valor: comparar criativo com três ofertas recentes e verdadeiras, imagem/preço e contexto. Não inventar descontos, depoimentos, membros ou escassez.
4. Continuidade de identidade: nome público “Achadinhos de Natal” e nome do grupo “TLA … #03” podem gerar dúvida. Testar compreensão antes de mudar identificadores da operação.
5. Privacidade e frequência: explicar de forma breve quem administra, o que será enviado e visibilidade do telefone. Só afirmar exclusividade de envio por administradores se a configuração estiver confirmada.

## Evolution e mensuração

Evolution possui GROUP_PARTICIPANTS_UPDATE / group-participants.update. Precisamos validar o payload da versão instalada. Um evento add representa inclusão, mas não identifica qual anúncio ou convite causou a entrada. Solicitação de entrada não equivale a participação.

O receptor deve autenticar a origem, isolar tenant/instância/grupo e deduplicar reentregas e o mesmo participante recebido por duas instâncias. Criar baseline de membros existentes; não contar sincronização inicial como aquisição. Medir add e remove; separar primeira entrada, reentrada e permanência em 24 horas. Persistir somente o mínimo necessário, com retenção definida. Relatórios agregados não exigem exportar telefones para publicidade, mas a implementação operacional também precisa de finalidade e controles próprios.

Não converter identificador @lid em telefone apenas removendo sufixo. PN precisa ser comprovado no payload/mapeamento. Não foi encontrada uma fonte histórica confiável e minimizada de entradas no armazenamento de mensagens da Evolution; não ler conversas para tentar reconstruir isso.

## Meta Conversions API

É tecnicamente plausível registrar o ingresso confirmado como conversão, com fila durável e event_id estável nas tentativas. Quatro etapas distintas: evento aceito, pessoa correspondida, evento atribuído e evento elegível para otimização. Aceitação HTTP não garante as outras três.

O convite comum não devolve fbclid/fbc/fbp nem identidade do navegador no evento do participante. Telefone normalizado e SHA-256 pode servir à correspondência quando seu uso for permitido; isso não garante atribuição nem cria vínculo determinístico interno. Hash não torna o telefone anônimo. Não fabricar fbc, telefone, consentimento ou action_source. Uma conversão no chat não pode ser rotulada como website apenas para desbloquear otimização.

A campanha de tráfego atual não passa a otimizar ingressos ao receber um evento Lead. É necessário verificar a disponibilidade do evento/conversão personalizada na conta, origem real e objetivo apropriado. Otimização por conversa em WhatsApp não significa otimização por participação em grupo.

O CAPI existente no código atende aquisição de publicadores e exige consentimento de marketing; não possui receptor de ingresso no grupo. Não reutilizar CompleteRegistration desse funil para consumidores sem distinção. Não foi confirmada aqui a presença de credenciais CAPI na produção.

O pedido de tratar clique no anúncio como consentimento não estabelece consentimento verificável para exportação de telefone e atividade à Meta. Não marcar aceite automaticamente. Consentimento não é a única hipótese legal possível; outra base exige avaliação e documentação do tratamento específico. Diagnóstico agregado e mensuração publicitária individual têm finalidades diferentes.

## Ordem recomendada

1. Validar abertura nativa no celular real e medir tempo até o destino.
2. Instrumentar entradas/saídas de forma minimizada, com autenticação, deduplicação e baseline.
3. Comparar períodos equivalentes: cliques, encaminhamentos, novas entradas e permanência. Não calcular conversão dividindo snapshots incompatíveis.
4. Testar continuidade visual e prova concreta de ofertas. Uma variável por comparação; sem prometer aumento antes de medir.
5. Com base e permissões definidas, validar CAPI em Test Events, correspondência, atribuição e elegibilidade de otimização; então preparar a campanha apropriada para revisão.

## Fontes

- Evolution, implementação de webhook: https://github.com/evolution-foundation/evolution-api/blob/main/src/api/integrations/event/webhook/webhook.controller.ts
- Evolution, eventos de participantes: https://github.com/evolution-foundation/evolution-api/blob/main/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts
- Meta, objetivos e otimizações: https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-campaign
- Meta, conversões personalizadas: https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-account/customconversions.md
- Meta, parâmetros de correspondência: https://github.com/facebook/capi-param-builder
- ANPD, guia de cookies: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- Chrome, limites de intents: https://developer.chrome.com/docs/android/intents
- Nielsen Norman Group, prova social: https://www.nngroup.com/articles/social-proof-ux/
- Referências de apresentação, sem validar alegações comerciais de terceiros: https://www.promobit.com.br/grupos-whatsapp/ ; https://www.pelando.com.br/grupos/ ; https://www.tabaratoclub.com.br/grupos
