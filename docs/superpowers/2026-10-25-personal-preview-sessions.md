# Minha Página: entrada com sessão ativa e expirada

## Escopo e critério

Validar a prévia pessoal em desktop 1440×900 e mobile 390×844 desde os primeiros quadros. Sessão ativa deve abrir com o tema autorizado. A recuperação da sessão deve manter um skeleton pessoal estável, sem sidebar, título de gestão ou atmosfera Ondas intermediária. Sem recuperação válida, mostrar login sem revelar o rascunho. Conferir também a abertura pelo editor e o retorno à edição.

## Diagnóstico e correção

A reprodução anterior falhou nos quatro cenários iniciais: o `AreaFrame` trocava o skeleton pessoal pelo `WorkspacePending` depois de resolver a sessão e antes de terminar `/team/context`. A amostragem registrou sidebar e título “Gerenciar link” nesse intervalo.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Skeleton pessoal, painel de gestão, prévia | Mesmo skeleton pessoal durante sessão e acesso pendentes | Evita composição intermediária de outra jornada. |
| Prévia aberta pelo roteador do editor reutiliza o fundo inicial da aplicação | Editor e idiomas abrem um documento da prévia após salvar | Permite resolver a aparência autorizada antes do primeiro HTML. |
| Carregamento transparente pode revelar o fundo anterior em transições | Estrutura da prévia ocupa a tela com o fundo autorizado ou pessoal neutro | Evita exposição do azul da plataforma; não armazena rascunhos no navegador. |
| Skeleton sem variáveis próprias de cor | Skeleton recebe fundo e tinta da aparência autorizada | Mantém legibilidade em temas claros e escuros. |

Mudanças restritas à apresentação e navegação. Conferência de sessão, autorização, restrição etária, workspace e salvamento permanecem nos fluxos existentes. Sem dependências novas ou alterações no backend.

## Ambiente de verificação

Playwright Test com API real local e PostgreSQL/Redis já existentes do ambiente descartável Ondas. Conta e rascunho próprios da validação, com identificador aleatório, removidos ao encerrar. Nenhuma conta de demonstração foi editada; nenhuma publicação, mensagem ou cobrança. O acesso expirado é um JWT com assinatura válida do ambiente E2E e expiração no passado, mantendo o refresh real. A conferência de acesso tem atraso controlado de 800 ms para expor a transição.

Scripts, logs, capturas e amostras de quadros: `output/profile-session-validation/`. O runner inicia e encerra somente seus próprios servidores em 3020/3347. Não executa setup/teardown global nem recria containers.

## Resultados

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Sessão ativa, tema claro | Aprovado | Aprovado |
| Acesso expirado, refresh válido, tema claro | Aprovado | Aprovado |
| Acesso expirado com sessão lembrada no navegador | Aprovado | Aprovado |
| Acesso e refresh indisponíveis | Login sem conteúdo privado | Login sem conteúdo privado |
| Abertura pelo editor e retorno à edição | Aprovado | Aprovado |
| Sessão ativa, tema escuro | Aprovado | Aprovado |
| Acesso expirado, refresh válido, tema escuro | Aprovado | Aprovado |

Playwright Test: 14 casos aprovados (`final-warm.log`), sem erros de execução da página. A recuperação real registrou `/auth/session` 401, `/auth/refresh` 200 e nova `/auth/session` 200. As amostras dos primeiros quadros não apresentaram sidebar ou título do painel; o cenário com sessão lembrada também não apresentou login intermediário.

Capturas abertas e inspecionadas nos dois tamanhos: carregamento claro/escuro, conteúdo pronto, sessão recuperada com cache e login. A revisão identificou e corrigiu contraste do aviso de prévia e extensão do fundo da autenticação. Conta de teste removida, confirmada por consulta com resultado zero; servidores próprios encerrados, sem recriação dos containers existentes.

Lint, tipos da aplicação/E2E e build aprovados no código final. Suíte completa final: 205 arquivos, 758 testes aprovados. Testes dirigidos finais: sete arquivos, 26 testes aprovados. O build mantém avisos preexistentes de alinhamento CSS, plugin ESLint e configuração de lockfiles; não impedem a compilação.

Graphify atualizado incrementalmente, somente extração local de código: 7759 nós e 27800 relações. Inclui a árvore compartilhada; CSS e capturas não são certificados pelo grafo.

## Arquivos e reversão

Alterações desta fatia em `frontend/src`: `app/layout.tsx`; `components/layout/site-shell.tsx` e CSS; `features/account/components/area-frame.tsx`; `features/profiles/profile-editor.tsx`, `profile-languages-screen.tsx` e `profile-preview-screen.tsx`; `features/profiles/components/profile-preview-shell.tsx`, `profile-preview-skeleton.tsx` e `profile-preview.module.css`. Regressões novas em `area-frame-preview.test.tsx` e `profile-preview-shell.test.tsx`.

Para reverter, retirar somente os trechos desta fatia e os dois testes novos, preservando as demais mudanças existentes. Não restaurar arquivos inteiros ou a árvore completa.

## Limites

Mobile emulado em Chromium, sem certificação de aparelho físico ou Safari. Sem autorização válida, a aparência privada não pode ser conhecida antes de recuperar a sessão: o skeleton usa o fundo pessoal neutro nesse intervalo. Não há cache persistente de conteúdo privado para contornar essa restrição. Reversão deve preservar as demais alterações preexistentes da árvore compartilhada.
