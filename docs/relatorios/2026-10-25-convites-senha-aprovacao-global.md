# Convites, recuperação de senha e aprovação global — 25/10/2026

## Resultado

Convites de equipe da conta, colaboradores da página, solicitações de acesso da agência e transferências de titularidade passam a enviar e-mail pelo Resend existente. O envio acontece após confirmar a transação. Repetições idempotentes não enviam outro e-mail. O remetente precisa estar ativo e com e-mail confirmado; o destinatário continua precisando confirmar sua própria identidade e aceitar as permissões existentes.

As telas distinguem envio aceito pelo provedor de falha de envio. Nos convites de equipe, o link continua disponível na criação como alternativa. Se o envio falhar, é possível revogar e criar outro convite para tentar novamente. Pedidos de agência e transferência continuam disponíveis nos respectivos painéis, com o erro de entrega explícito. Nenhum envio concede acesso por si só.

A recuperação de senha já tinha telas e e-mail. A correção vincula emissão, consumo e atualização da senha ao tenant, substitui tokens atomicamente no Redis e preserva consumo único e expiração de 30 minutos. Um pedido novo invalida o anterior mesmo com requisições concorrentes. O endpoint valida o formato do token e o limite em bytes do bcrypt. Conta inexistente recebe a mesma resposta genérica. A página de reset usa `no-referrer` e remove o token da URL após salvar. O retorno do login ao convite de equipe agora preserva `scope=workspace`, com destinos locais estritamente permitidos.

## Escopo do limiar da IA

Uma única configuração por tenant, `MODERATION_AUTO_APPROVE_THRESHOLD`, governa os conteúdos sujeitos a aprovação:

| Superfície | Aplicação da política |
| --- | --- |
| Novo link do catálogo | Worker existente e decisão compartilhada por confiança |
| Alteração de nome/descrição do link | Fluxo existente de proposta, preservando a versão aprovada |
| Página, grupos, links, traduções, eventos e blocos | Validação da publicação e comparação com o conteúdo aprovado |
| Foto da página e imagens dos blocos | Pixels dos novos anexos pertencentes à conta entram na mesma análise da página |
| Ícone/imagem do link | Aprovação pelo mesmo limiar; imagem nova pendente não substitui a aprovada |
| Convite permanente e seus destinos | Validação existente de conteúdo, destino, disponibilidade e revisão |
| Campanha | Validação do snapshot e da página de origem |
| Coleção pública | Texto da curadoria segue o limiar; links e mídias precisam estar aprovados e disponíveis |
| Mídia kit e projeções públicas | Usam conteúdo da página aprovada, links próprios publicados e campos estruturados já validados |

Em **0%**, anexos elegíveis também são aprovados sem chamar a IA. Acima de zero, é necessário parecer positivo e confiança suficiente. Erro, parecer negativo ou confiança insuficiente preservam a proposta para revisão humana; os anexos anteriores aprovados permanecem no ar. Avisos de revisão humana de anexos são criados após a tentativa automática, evitando pedir revisão de uma imagem que a IA acaba de aprovar. Uma configuração vazia não é interpretada como zero.

Imagens são enviadas como partes visuais da requisição existente, sem duplicar base64 no texto. Os bytes não entram nos logs, auditoria ou avisos operacionais. Tipo, tamanho, decodificação e isolamento dos anexos continuam sendo validados antes da análise. Mudanças concorrentes de política, suspensão ou substituição do anexo impedem a aplicação de uma aprovação desatualizada.

Aceitar equipe, aprovar acesso a uma conta, transferir titularidade, consentimento, confirmação de e-mail e autorizações continuam decisões da pessoa responsável. O limiar regula aprovação de conteúdo público.

## Verificação executada

- Backend: lint, typecheck, build e **676 testes unitários** aprovados na cópia isolada.
- Integração completa: **460 testes**, em **56 arquivos**, com PostgreSQL/Redis descartáveis.
- Últimos ajustes: **14 testes** de equipe de página e **29 testes** de mídia/revisão operacional aprovados, incluindo remetente sem confirmação, preservação da imagem anterior e criação da revisão humana após a IA. São repetições focais, não testes adicionais aos totais anteriores.
- Frontend: lint, tipos de aplicação/E2E e **764 testes** aprovados na cópia inicial; após incorporar a correção da home `8b40ad21`, os **3 testes** de ondas também passaram. Total combinado de 767, sem apresentar como uma única execução integral da nova base.
- **44 casos E2E** aprovados, incluindo setup, e-mail de recuperação e login com a nova senha, convites em duas sessões, revogação, escopo administrativo, anexos em 0%, revisão humana e quatro capturas de configuração.
- Capturas desktop/mobile de Windows e Chromium Linux inspecionadas antes de atualizar as quatro referências de `/admin/configuracoes`. No Linux, a diferença esperada é o texto ampliado do escopo e seu reflow. As referências Windows ainda mostravam a estrutura visual anterior, incluindo o botão de pausa e os controles antigos; foram reconciliadas com a base já existente, sem atribuir essas mudanças visuais a esta entrega. Sem aumento de tolerância ou desativação de checks de acessibilidade.
- Playwright MCP em contexto separado: envio de esqueci a senha pelo teclado, resposta genérica, desktop, 390 px e zoom de 125%. Os E2E de equipe também verificam foco, teclado e reflow.
- Build Next de produção executado pelo setup E2E. A validação usou cópia isolada do checkout, sem disputar build, sessões ou portas de outras tarefas.

Logs e capturas locais ficam em `output/`, especialmente `final-backend-unit.log`, `final-backend-pg.log`, `final-e2e.log`, `media-review-after-ai-green.log` e `invite-validation-20261025/`. A primeira rodada E2E teve quatro expectativas antigas de texto; a rodada final já contém as expectativas atualizadas e passou integralmente.

O índice Graphify foi atualizado incrementalmente por extração local de código, sem LLM/API ou envio externo. Os arquivos gerados já tinham alterações concorrentes e ficam fora do commit desta entrega. CSS, capturas e arquivos sem símbolos continuam exigindo validação real.

## Limites e operação

- Não houve teste de recebimento em caixas postais reais nem chamada de aprovação visual a um provedor pago durante os testes; foram usados outbox, transporte controlado e PostgreSQL/Redis reais. Aceitação pelo provedor não comprova caixa de entrada ou ausência de spam.
- Links de recuperação emitidos antes da mudança devem ser solicitados novamente. Trocar a senha não revoga sessões já emitidas; isso mantém o contrato anterior de sessão.
- A IA recebe os pixels das imagens anexadas permitidas pela plataforma. Vídeos externos são representados pelos seus campos/URLs; não há inspeção integral de vídeos nem do conteúdo interno de grupos privados.
- O limiar vale para as próximas análises; salvar a configuração não reprocessa em massa decisões anteriores.
- A publicação ocorre pelo CI/CD da main, após os gates existentes. O run associado ao SHA registra o resultado do deploy e as verificações de saúde.
- Reversão: reverter o commit desta entrega e passar novamente pelo CI/CD. Não há migração de banco nesta mudança. Reverter código não desfaz e-mails enviados, senhas alteradas ou aprovações já gravadas.

## Referência técnica

Formato de entrada visual conferido na [documentação oficial de imagens da OpenAI](https://developers.openai.com/api/docs/guides/images). O modelo e o transporte existentes foram preservados. A configuração do navegador Linux usa Playwright 1.63.0 compatível com a versão instalada, em container próprio.
