# Convites de equipe — segurança, 21/10/2026

## Resultado e alcance

No código local, a criação e a edição já consultavam o papel atual no banco e rejeitavam permissões administrativas concedidas por USER. A listagem também já removia as nove seções administrativas dessas contas. O relato de categorias administrativas visíveis para um usuário comum não foi reproduzido no ambiente isolado; não houve consulta a contas ou dados de produção.

O aceite tinha uma lacuna: validava o formato das permissões, mas não revalidava o papel atual do remetente. Agora usa a mesma validação da criação/edição, dentro da transação e após bloquear a linha do titular. Convites administrativos de quem perdeu ADMIN retornam 403 antes de criar/alterar vínculo, consumir convite ou registrar aceite. A autorização das requisições administrativas já verificava o papel atual do titular.

Para contas sem seções administrativas, o perfil completo se chama “Gestor da conta” e explica que não concede administração do Tem Link Aqui. O nome “Administrador” permanece apenas quando o servidor disponibiliza seções administrativas. O fluxo não altera o papel global do destinatário.

## Arquivos da correção

- `backend/src/repositories/workspace-team.ts`: revalidação no aceite.
- `backend/src/http/workspace-team.pg.spec.ts`: regressões de criação, edição, listagem, token antigo e aceite após perda de ADMIN.
- `frontend/src/features/workspace-team/permission-profiles.ts`: nome e descrição conforme escopo disponibilizado pelo servidor.
- `frontend/src/features/workspace-team/permission-profiles.test.ts`: nomes, resumo e preservação do escopo.
- `frontend/e2e/workspace-team.spec.ts`: cenário USER pela API/UI e atualização dos seletores do nome alterado.

## Verificações executadas

- Frontend: lint e typecheck passaram; 17 testes nos arquivos permission-profiles.test.ts e permission-editor.test.tsx passaram.
- Backend: lint, typecheck e build passaram; 16 testes de workspace-team.pg.spec.ts e workspace-permissions.spec.ts passaram. PostgreSQL descartável próprio na porta 17434, removido após a execução.
- E2E: quatro testes passaram, selecionados por `ordinary accounts|administrative delegation`, nos projetos features e features-mobile. Incluem ausência das nove seções administrativas para USER, recusa por API, convite válido de gestor, delegação por ADMIN e preservação do papel global. Axe sem violações no diálogo testado; não equivale a certificação de acessibilidade.
- Build frontend passou no ambiente isolado usado pelo E2E. Duas tentativas no checkout compartilhado falharam: arquivo de outra alteração temporariamente incompleto e módulo ausente no diretório .next. Nenhum desses arquivos foi corrigido por esta tarefa.
- A suíte original estava reservada por outro processo. A execução própria usou cópia local em `output/team-security-validation`, portas com offset 22000 e containers `divulgador-e2e-*-team-security-20261021`, removidos pelo teardown. Nenhum processo de outra tarefa foi encerrado.
- Capturas desktop/mobile de `account-manager-permissions.png` foram inspecionadas em `output/team-security-validation/frontend/test-results/`. O diálogo usa rolagem interna; não foram refeitos todos os estados, zoom ou testes em aparelho físico.
- Graphify atualizado incrementalmente, sem LLM/API: 118 arquivos reprocessados, 1257 reutilizados, 7115 nós e 24763 relações. Inclui alterações simultâneas; relatório/HTML anteriores permanecem históricos. Aviso de extração parcial em contact-handling.test.tsx, fora desta correção.

## Reversão e limites

O patch `output/team-security-fix.patch` contém somente os cinco arquivos da correção. Para desfazer, revisar/aplicar esse patch ao contrário, preservando alterações posteriores. Não foi executada reversão, commit, push, deploy ou migração de produção.

Produção, papel cadastrado da conta relatada e histórico de convites reais não foram auditados. As categorias relatadas não devem aparecer na resposta de `/team` para USER na versão local verificada. Não afirmar que a versão publicada ou o cadastro dessa conta estão corretos sem essa verificação específica.
