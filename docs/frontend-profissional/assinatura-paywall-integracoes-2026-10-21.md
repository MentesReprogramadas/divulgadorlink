# Assinatura, conteúdo Premium e integrações — 21/10/2026

## Resultado e fronteira

Revisão solicitada pelo usuário: assinatura acessível pelo menu comum, paywall contextual, checkout legível, configuração administrativa explicada e remoção de estados comerciais incompletos da tela do cliente. Sem página, a tela mostra somente uma orientação central com a ação Criar minha página. Sem catálogo vendável, não mostra cartões com preço indefinido ou recursos em preparação. Uma assinatura existente continua acessível para consulta e cancelamento mesmo sem uma página.

A configuração local não possui preços e conexão Stripe prontos para novas vendas. Isso é diferente de uma funcionalidade ausente. Nenhum valor comercial, contrato, declaração fiscal ou liberação de vendas foi inventado. O checkout continua hospedado na Stripe; confirmação assinada, idempotência, próxima renovação e preservação do período pago permanecem no servidor. Os preços usados nos testes são fixtures, não uma proposta comercial.

## Mudanças

- Sidebar sem os cabeçalhos Meu espaço/Administração acompanhados da marca. Planos e assinatura é um item normal de menu; o cartão promocional foi removido. Recursos pagos recebem cadeado e destino contextual quando o servidor informa falta de cobertura e o usuário pode consultar cobrança.
- Checkout compartilhado, resumo do plano/preço mensal, condições de recorrência e confirmação; duas colunas em desktop e uma em celular. Botões permanecem acessíveis a 320 px com fonte em 200%. Nenhuma ativação pelo simples retorno do pagamento.
- Admin com roteiro de conexão, produtos/preços mensais BRL, recursos e liberação. Separação explícita entre assinaturas de páginas e destaques de catálogo. Edições de plano e contratos anteriores preservados.
- Gestão mantém a decisão entre abas/seletor baseada no espaço completo, sem oscilar por causa das ações da aba escolhida. Filtros só aparecem nas áreas com filtros reais.
- Notas usam o componente existente de descrição, com Ver mais/Ver menos no próprio cartão. Confirmação de atendimento em diálogo; histórico com ícones, cores, grade e paginação; notas também paginadas.
- Integrações distinguem fila, resposta HTTP e falha. O comando de desenvolvimento inicia API e consumidor de webhooks juntos. O modo dedicado não inicia consumidores financeiros ou de moderação.

Os ajustes anteriores de DNS, idioma automático do navegador, bandeiras, revisão de publicação e catálogo estão registrados em [DNS, idiomas e atendimento](ajustes-dominio-idiomas-atendimento-2026-10-21.md).

## Reconciliação do roadmap de planos

F11 já tinha recorrência, autorização e gestão. F14 entrega agendamento; F31 entrega estatísticas; F10 entrega subdomínios da plataforma, condicionado ao mapa de domínios e infraestrutura real. O recurso `profile.richBlocks` ainda não tinha conteúdo concreto; agora possui texto, imagem com legenda/descrição acessível e vídeo público do YouTube/Vimeo, por escolha expressamente delegada pelo usuário. Aparência, eventos e formulário existentes continuam gratuitos.

Texto ajuda a explicar serviços e ofertas; imagem serve ao portfólio; vídeo apresenta o trabalho dentro da página. A escolha se apoia em formatos existentes no mercado: [conteúdo e links do Linktree](https://linktr.ee/help/en/collections/7058291-links-and-content), [formatos incorporados](https://linktr.ee/help/en/articles/8614037-adding-links-what-s-possible) e [páginas Beacons](https://home.beacons.ai/websites). Essas referências fundamentam os formatos, sem copiar a identidade visual. A composição de resumo do checkout foi comparada com Stripe Checkout e a comparação de planos com Notion; o banner decorativo da primeira proposta foi descartado a pedido do usuário.

O editor reutiliza rascunho, prévia, revisão, publicação e histórico. É possível adicionar, editar, ocultar, ordenar e remover blocos. Conteúdo novo/alterado passa pela moderação existente, inclusive os campos dos blocos. URLs são validadas por uma lista de provedores; não há HTML livre. O vídeo não faz conexão com o provedor antes da escolha explícita de carregar. Textos do sistema acompanham pt-BR/en/es; textos escritos pelo cliente continuam no idioma original.

Imagens reutilizam a normalização WebP existente, sem metadados e com limite de 512 px/256 KB no servidor; a seleção aceita até 5 MB antes da redução local. Limite técnico de doze blocos por página. Arquivos não são exportados: o backup conserva texto/vídeo e declara a necessidade de reenviar blocos de imagem. Nenhuma biblioteca adicionada.

Cobertura é conferida no servidor, na edição e em cada projeção pública, incluindo campanhas. Ao vencer, os blocos e suas URLs de imagem deixam de ser públicos; o rascunho é preservado e aceita remoção. As imagens de revisões retidas são preservadas. A transferência de titularidade leva blocos e imagens do rascunho/publicações/histórico e mantém cobrança separada, aproveitando a transação e as permissões existentes.

## Ambiente e validação

Foi encontrada uma entrega local PENDING, com zero tentativas, sem consumidor em execução. Depois de iniciar o consumidor de webhooks, o destino respondeu HTTP 200 e a entrega passou a DELIVERED, com uma tentativa. Isso confirma a recepção HTTP, não a execução de todos os passos internos do destinatário. O consumidor dedicado ficou em execução local; novos `npm run dev` iniciam ambos os processos. Nenhuma alteração em produção.

As migrações `20261021180000_profile_content_blocks` e `20261021181000_profile_content_blocks_transfer` são aditivas, com vínculo composto de tenant/proprietário/página e FK diferível compatível com a transferência existente. Ambas foram aplicadas ao banco local e ao PostgreSQL descartável de validação.

Resultados concluídos: frontend 17 arquivos/91 testes; backend 7 arquivos/25 testes de domínio/worker; PostgreSQL 6 arquivos/56 testes de perfil, publicação, agendamento, exportação, revisão e campanhas, mais 2 arquivos/7 testes de blocos e agência/transferência. Lint e tipos dos dois pacotes passaram, incluindo a compilação dos testes E2E. Build do backend passou; o frontend foi compilado em modo de produção no diretório isolado `.next-e2e` pelos executores de navegador. A tentativa de build padrão em `.next` não concluiu e interferiu no dev local; foi encerrada e a configuração recarregada, com resposta HTTP 200 confirmada em `localhost:3001/login`.

E2E real, desktop e celular:

| Execução | Resultado e alcance |
| --- | --- |
| `f11-blocks-final-20261021` | 55 aprovados; dois F11-E08 falharam na checagem de imagem feita pelo cliente HTTP sem resolução de `profiles.localhost`. Corrigido para fetch no navegador. Inclui hosts, cobertura, agendas, métricas, atendimento, webhooks, sidebar e Gestão. |
| `f11-ui-accepted-20261021` | 21 aprovados; os dois E08 identificaram um seletor que confundia editor/prévia e dados mantidos entre desktop/mobile. Corrigidos com escopo do editor e limpeza explícita da fixture. Inclui checkout, ausência de página, configuração admin, falhas/renovação/cancelamento, notas, integração e abas. |
| `f11-content-proof-20261021` | 3/3 aprovados, incluindo setup e E08 em desktop/mobile. Checkout Premium, fonte em 200%/320 px, edição dos três formatos, imagem, moderação/publicação, vídeo após escolha e perda de cobertura sem perder conteúdo. |

Os casos com falha foram corrigidos e reexecutados; não há falha de aceitação conhecida pendente nesse escopo. Axe não encontrou violações das regras exercitadas nas telas de checkout/editor. Isso não constitui declaração de acessibilidade integral. Teclado, foco, resize, zoom e capturas foram exercitados e inspecionados; as alterações de espaçamento dos modais vieram da inspeção das capturas em fonte ampliada.

Capturas finais: [criação da página](evidencias/assinatura-2026-10-21/desktop-billing-create-page.png), [checkout](evidencias/assinatura-2026-10-21/desktop-subscription-checkout.png), [checkout a 320 px/200%](evidencias/assinatura-2026-10-21/mobile-subscription-checkout-zoom.png), [editor no celular](evidencias/assinatura-2026-10-21/mobile-premium-content-editor.png), [publicação](evidencias/assinatura-2026-10-21/mobile-premium-content-public.png) e [admin](evidencias/assinatura-2026-10-21/mobile-billing-admin.png). Valores exibidos são fixtures de teste.

Não foram realizados pagamento real, publicação remota, configuração de certificado/DNS público ou revisão fiscal. Ativar vendas exige preços e credenciais reais no ambiente correto. Subdomínio próprio depende também da configuração do servidor para aquele tenant. Essas condições não são simuladas para clientes locais.

## Reversão

Árvore compartilhada com alterações anteriores e simultâneas: reverter somente os trechos desta revisão, sem restaurar arquivos inteiros. Para desligar o recurso comercial, retirar a capacidade das novas ofertas sem apagar rascunhos ou revisões. Ao retornar código antigo, conservar as tabelas aditivas e a leitura compatível de `contentBlocks` nos snapshots, ou selecionar antes uma publicação anterior validada; o parser antigo estrito não lê o campo novo. Não executar DROP como reversão automática. O consumidor dedicado desta revisão pode ser encerrado pelo seu PID registrado no ambiente, sem encerrar a API ou processos de outras tarefas. Os containers descartáveis foram removidos. Sem commit, push ou deploy.
