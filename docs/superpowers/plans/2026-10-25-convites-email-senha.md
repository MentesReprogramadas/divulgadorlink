# Convites por e-mail e recuperação de senha

**Pedido:** enviar convites por e-mail, revisar esqueci a senha e publicar na main. Execução e publicação autorizadas pelo usuário nesta conversa.

**Decisões:** reutilizar Resend, templates e telas existentes. Enviar após confirmar a transação; distinguir aceitação pelo provedor de falha de envio. Manter o link manual como alternativa explícita. Não enviar novamente em repetição idempotente. Incluir equipe da conta, equipe da página, acesso da agência e transferência de titularidade. Nenhum acesso muda antes do aceite/autorização existente.

**Segurança:** reset com token aleatório, hash no Redis, tenant obrigatório, expiração de 30 minutos, consumo único e substituição atômica. Manter resposta genérica para e-mail inexistente. Não alterar cobrança, permissões ou confirmação de identificadores.

- [x] Reproduzir ausência de mensagens nos convites e falta de isolamento do reset em testes.
- [x] Acrescentar template e entrega compartilhada nos quatro fluxos, com erro visível e sem duplicação.
- [x] Corrigir isolamento e concorrência do reset; validar link recebido e login com senha nova.
- [x] Ajustar feedback das telas existentes; verificar teclado, mobile e estados de erro.
- [x] Executar lint, tipos, testes, builds e E2E afetados; atualizar índice local incremental.
**Publicação autorizada:** commit apenas dos arquivos desta tarefa, push na main e acompanhamento do CI/CD e da saúde de produção. O run associado ao commit registra a execução desta etapa.

## Ampliação solicitada durante a execução

Aplicar o componente **Aprovação pela IA** como política global de todos os conteúdos que precisam de aprovação, incluindo páginas, anexos, links, textos, convites e coleções. Mapear primeiro os fluxos reais e seus consumidores. Em 0%, pular apenas a IA para conteúdos elegíveis; manter bloqueios de conteúdo/destino, verificação, suspensão, permissões e demais validações. Revisão não significa recusa definitiva; coleções não aprovadas continuam privadas. Executar após concluir convites/senha e antes da publicação conjunta em produção.

**Limites:** alterações preexistentes na home ficam fora do commit. Aceitação pelo provedor não comprova recebimento na caixa postal. Sem novas dependências ou migrações. Reversão pelo commit desta tarefa; tokens de reset antigos podem exigir novo pedido devido ao vínculo de tenant.
