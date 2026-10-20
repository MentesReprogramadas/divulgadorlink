# Execução F22 — Formulário de contato

Autorização: implementar F22 → F23 → F25 e parar após F25. Branch atual codex/roadmap-f37-testes; preservar alterações anteriores; sem commit/push/deploy.

## S0 — contrato e decisões D24

- Campos allowlist: nome, e-mail, telefone, empresa, mensagem. Proprietário escolhe presença/obrigatoriedade; ao menos e-mail ou telefone obrigatório. Finalidade Contato/Orçamento/Lista de espera tem títulos fixos, evitando publicar HTML ou texto arbitrário sem moderação. Alternativa de builder livre adiada por ampliar superfície e exigências de moderação.
- Configuração versionada, independente do conteúdo da página, ativada explicitamente ao salvar. Formulário público só disponível quando a página está publicada, conta ativa e idade confirmada quando exigida. Prévia usa o mesmo renderer, sem enviar contatos reais. Respostas nunca integram JSON público, analytics ou logs.
- Retenção 180 dias, exclusão manual por resposta e expurgo diário/na leitura. Preferência de novidades separada e inicialmente desmarcada; salvar contato não inscreve em outras listas nem envia mensagens externas. Preferência expira junto do contato. Alternativa de retenção ilimitada rejeitada.
- Antispam: honeypot; 5 envios/10 minutos por formulário e identificação derivada do contato, teto 100/h por formulário. Identificador HMAC por formulário com segredo existente; buckets expiram em até 1h. Sem IP bruto persistido. Chave UUID e hash de conteúdo impedem duplicação/reuso com alteração; transação e lock por formulário.
- Respostas: paginação 25 e exportação CSV da página atual explicitamente identificada, com proteção contra fórmulas. Evita exportação ilimitada em memória e truncamento silencioso; exportação assíncrona total é alternativa futura.
- Permissão global própria Contatos (ler/escrever), sem conceder automaticamente para equipes existentes. Compartilhamento antigo de página não concede acesso a contatos.

## Reúso

assertProfileOwner/publicProfile (conta, tenant, publicação e idade), API/BFF/CSRF, primitivas Field/Input/Select/Button, modais/estados e estrutura de workspace. Nova persistência porque respostas pessoais não pertencem à publicação ou ao log de auditoria. Sem biblioteca nova. Evidências locais S1–S6 abaixo; S7 remoto separado.

## Evidências locais S1–S6

Domínio RED real: 2 falhas comportamentais/2 controles passando, depois 4/4 verdes. Tentativa inicial com aspas inválidas não conta como RED. Componentes/ícones: 7/7. PostgreSQL/HTTP real: 5/5, T01–T05, incluindo autorização granular e concorrência. Lint/typecheck/build backend aprovados; frontend lint/typecheck aprovados e build Next de produção no harness. Playwright desktop/mobile: 7/7 (setup incluído), três jornadas por viewport. Rodada anterior 5/7 falhou porque APIRequestContext não resolvia checklist.localhost; teste corrigido para fetch no navegador, sem alterar aplicação ou simular persistência. Logs output/f22-*.log. Não somar repetições.

Capturas/hashes: docs/frontend-profissional/evidencias/f22-2026-10-19/capturas.json. Inspeção nativa mobile da configuração em etapas e formulário público; público capturado também com banner de consentimento. Teclado, falha/recuperação e 320px/zoom cobertos em E03; Axe A/AA no artigo público sem violações. Emulação Chromium não comprova aparelho físico. Regressão final do lote e S7 remoto ainda pendentes. Migração testada somente no PostgreSQL descartável 5835 e no harness; banco pessoal não alterado nesta feature.

Referência: [WAI notificações de formulário](https://www.w3.org/WAI/tutorials/forms/notifications/) orienta feedback conciso de sucesso/falha e erro próximo ao campo; [instruções](https://www.w3.org/WAI/tutorials/forms/instructions/) fundamenta labels e obrigatoriedade. Reutiliza identidade local sem copiar layout externo.

Reversão: desativar formulário pela configuração antes de retirar rotas; preservar tabelas e exportações, sem DROP. Nenhum contato enviado a serviço externo. S7/CI/liberação remota em revisão; não iniciada F24.

## Ajuste de antispam ao inspecionar o BFF

O upstream existente não encaminha IP do visitante e o backend não confia globalmente em proxies. Usar request.ip agruparia todos os visitantes do BFF no mesmo limite de 5 envios. Corrigido para HMAC do e-mail/telefone validado, separado por tenant/formulário, mais teto global 100/h e honeypot. Não habilitar confiança ampla em X-Forwarded-For nem introduzir cookie de rastreamento. Bucket sem contato em texto, expira em até 1h; respostas seguem privadas. PG final confirma que contatos diferentes não compartilham o limite individual.

## Fechamento do lote

S0–S6 locais verificadas. PG próprio final 5/5, incluindo antispam corrigido e auditoria do colaborador que configura; grant global separado do compartilhamento legado. Playwright próprio final 6/6, dentro dos 37/37 do lote. Capturas finais 12 (1280/1440/768/390 e 320px com zoom), gap padronizado com tokens existentes, inspeção nativa desktop/mobile. [Evidências e hashes](evidencias-f22.json). [Fechamento e falhas da regressão compartilhada](execucao-f25.md).

Lote: backend 598/frontend 413, PG novo 19 e regressões PG 78, lint/typecheck/build aprovados nos ambientes declarados. [Migrações com dados anteriores preservados](evidencias-migracoes-f22-f25.json). Nenhuma dependência instalada. Banco pessoal/externo preservados; migrations devem ser aplicadas ao alvo durante liberação autorizada. S7 remoto pendente. Parada após F25; F28 não iniciada. Dados de fixtures em screenshots são sintéticos; nenhuma mensagem real foi enviada.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.

Complemento final de apresentação: formulário público centralizado e integrado ao tema (campos, fonte, cantos, botão e checkbox); rótulo Quero receber novidades e retirada do parágrafo de retenção dessa área. Aceite opcional continua desmarcado. Validação local antecipa erros sem substituir o servidor; formulário salvo também aparece na prévia lateral via /preview/items, com configuração ao vivo e restauração ao cancelar. Evidências consolidadas no refinamento vinculado.
