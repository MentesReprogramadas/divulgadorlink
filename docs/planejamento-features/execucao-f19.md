# Execução F19 — prévia e histórico de versões

## Autorização e estado

17/10/2026: usuário autorizou F19 e continuação das features sem parar por entrega. Pedido posterior delega decisões à melhor escolha fundamentada, com alternativas registradas. Checkout main, base a7aad9c, árvore inicialmente limpa. Sem autorização nova de commit, push ou deploy: implementação local. S7 remoto permanece em revisão, pois CI de mudanças não commitadas não foi executado.

## S0 — reconciliação e decisões

A prévia privada, renderer público, autosave serializado e descarte da versão publicada já existem. F19 acrescenta histórico de publicações; não duplica prévia, não cria novo editor e não arquiva cada autosave.

| Decisão | Escolha e motivo | Alternativas consideradas |
| --- | --- | --- |
| D21 retenção | Até 50 publicações por 180 dias, incluindo e preservando a atual, conforme usuário. Datas UTC, interface America/Sao_Paulo. | Histórico ilimitado ou só prazo: rejeitados pela decisão já tomada. |
| D21 mídia | Usuário escolheu não guardar fotos antigas. Se o arquivo foi removido, restaurar sem foto e avisar; draft e foto pública seguem a política existente. | Reter arquivos enquanto referenciados por histórico: apresentado e recusado. Bloquear toda restauração por foto ausente: pior recuperação de conteúdo. |
| Identidade | Preservar endereço, tenant, dono, permissões e cobrança atuais; só restaurar apresentação e links. | Restaurar slug antigo pode disputar outro endereço e mudar identidade sem intenção. |
| Validação | Revalidar segurança/disponibilidade e referências no restore, sem publicar; publicação posterior mantém a moderação atual. | Publicar automaticamente ao restaurar foi rejeitado; confiar em destinos antigos pode reativar conteúdo revogado. |
| Persistência | ProfileRevision separado, imutável, com FK composta e versão única. Snapshot privado completo inclui ocultos e aparência. | AuditLog não contém todos os dados restauráveis. Copiar só a projeção pública perderia os itens ocultos. |
| Legado | Importar apenas publicação atual e marcar data de importação. | Reconstruir versões ou datas antigas por suposição é incorreto. |
| Concorrência | Reusar lock do dono e versão otimista. Publicação repetida continua idempotente e cria um snapshot; restores concorrentes têm um vencedor e conflito. | A spec previa conflito também em publicação duplicada: reconciliado com a idempotência existente, sem quebrar seu contrato. |
| Interface | Entrada Histórico no editor, página de lista, diferenças em diálogo, confirmação explícita e link para a prévia já existente. Só diferenças abertas; campos iguais recolhidos. | Abas extras no editor ou outro renderer de prévia repetiriam lógica e aumentariam a densidade. |

Referência complementar: [WordPress Revisions](https://wordpress.org/documentation/article/revisions/) fundamenta lista, comparação e restauração explícita, sem copiar identidade ou sua política de autosaves. Direção dominante mantém cards, tokens e controles do próprio painel. Skill temlink-components, temlink-icons e revisão temlink-ui-validation aplicadas; nenhuma biblioteca nova.

## S1–S3 — domínio, dados e API

- `profile-history.spec.ts`: RED real de limite/expiração (dois casos falharam), depois GREEN; allowlist e preservação de identidade verificadas.
- Migração `20261017230000_profile_revisions`: FK composta para Profile, unicidade profile/version, checks de snapshot/versão/avatar e trigger contra UPDATE. Exclusão para retenção e cascata continua permitida. Backfill da publicação atual usa snapshot privado quando disponível e marca imported.
- `profile-revisions.ts` registra na mesma transação da publicação automática ou humana (painel/WhatsApp), calcula seleção disponível e prune. Sem snapshot de conteúdo recusado.
- `profiles-repository.ts` reaproveita autorização, lock, versão, mídia, projeção e publicação. Escrita de grupos/itens foi extraída para os consumidores salvar, descartar e restaurar; catálogo revogado não é reativado.
- GET `/me/profile/revisions`, GET `/me/profile/revisions/:id`, POST `/me/profile/revisions/:id/restore` com `{expectedVersion}`; tudo privado/no-store. Tenant vem do host e sessão, nunca do body. Restore responde ProfileState e warnings; UUID alheio/expirado 404, conflito 409, destino inválido 422, indisponibilidade 503.
- Seleção de retenção impede leitura/restauração vencida imediatamente. Limpeza física ocorre no ciclo diário existente do worker e na publicação; preserva a atual. Contas suspensas continuam sujeitas à limpeza interna, sem conceder acesso ao dono.

## S4–S6 — interface e provas

- Componentes ProfileHistoryScreen, ProfileRevisionComparison e skeletons reutilizam o DS. Restauração não é enviada ao abrir comparação nem antes de confirmar. Botões ocupados não reenviam; falhas mantêm o contexto; o dono recebe aviso de foto removida.
- Entrada Histórico aguarda flush do autosave antes de navegar. Prévia e publicação não foram duplicadas. Snapshot completo não sai na leitura pública, que mantém projeção allowlisted e idade.
- Dados das capturas são sintéticos; datas das revisões são fixadas no banco da fixture, sem mascarar tela ou alterar o produto. Desktop 1280×720, mobile 390×844 e 320px com texto 200%.
- Auditoria Axe inicialmente capturou opacidade intermediária da animação: diagnóstico real do Chrome mostrou cor #5c6b7f e opacidade 1 no estado estabilizado. Teste passou a aguardar CSS estável, sem desabilitar contraste. Outro controle do teste foi escopado para excluir o anunciante de rota do Next.
- Inspeção das capturas detectou token inexistente --space-5: cards sem padding/gap. Corrigido para --space-6, com assertivas reais de padding e distância entre cards. Não bastou a suíte funcional verde.
- Novo teste preexistente F42-E11 tinha portas fixas 3333/4099. Ajustado para runtime parametrizado; nenhuma regra ou credencial Evolution alterada.

## Resultados

| Verificação | Resultado executado |
| --- | --- |
| Backend unitários | 460 em 109 arquivos aprovados; inclui três F19 e RED/GREEN documentado. |
| Frontend unitários | 257 em 78 arquivos aprovados; refinamento de comparação revalidado com quatro testes específicos. |
| PostgreSQL | 56 em quatro arquivos aprovados; oito cenários F19 cobrem os quatro ACs, histórico, mídia, migração e concorrência. |
| Playwright | 54 cenários únicos verificados: 52 passaram na regressão inicial, dois F42-E11 falharam por portas fixas e passaram após ajuste. Execução final focada: seis aprovados (quatro F19 + dois F42-E11), sem retry/skip. Não há um único relatório integral 54/54. |
| Tipos/lint | Frontend e backend aprovados. |
| Build | Backend e Next em modo produção aprovados; frontend compilado na cópia isolada. |
| Visual/manual | Oito capturas desktop/mobile/320px e conflito inspecionadas; cards com 24px/16px de padding, espaçamento validado. Comparação com Axe estável, teclado e foco nativo do diálogo. |

Evidências em [capturas F19](../frontend-profissional/evidencias/f19-2026-10-17). Logs/JSON em `output/roadmap-f19`: `backend-unit.log`, `frontend-unit.log`, `postgres.log`, `e2e-f19-results.json`, `e2e-regression-results.json` (parcial) e `e2e-accepted-results.json` (seis finais), tipos/lint/build e migração local. RED/GREEN de domínio em `output/panel-redesign/f19-unit-{red,green}.log`. Os componentes foram testados durante a integração S4; não foi fabricado um RED anterior ao código. O ciclo foi reconciliado com essa execução real.

Uma inicialização do harness encerrou com código nativo Windows 3221225794 antes da API; limpeza própria e nova inicialização passaram, sem mudar regras ou encerrar processos alheios. Manifesto de fontes `source-manifest.json` liga os arquivos à cópia validada. CI, commit, push e produção não executados; S7 em revisão, sem inventar run ou aprovação remota.

## Reversão e limites

Migração foi aplicada ao banco local confirmado localhost:5437 e aos descartáveis. Mudança aditiva: desabilitar entrada Histórico e voltar aos handlers anteriores preservando a tabela. Ao voltar código antigo, publicações novas deixam de ganhar snapshots; não apagar histórico como atalho. Remover tabela/trigger/função só por migração compensatória revisada após backup e confirmação. Nenhuma reversão destrutiva, commit, push, deploy ou ensaio de produção foi executado.

Fotos já removidas antes/depois desta feature não podem ser recuperadas. UI de comparação usa campos e blocos semânticos, não diff caractere por caractere. E2E usa Chromium e emulação mobile, sem alegar aparelho físico ou acessibilidade total. S7 remoto/produção continua pendente de autorização de publicação e evidência própria; não bloquear preparação da F08, que é independente.
