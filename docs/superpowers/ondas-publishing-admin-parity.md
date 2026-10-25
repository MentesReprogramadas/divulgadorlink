# Publicação, administração e anexos — 23/10/2026

O inventário individual de apresentação está em `ondas-component-audit-publishing-admin.csv`. A revisão deste lote é de código e comportamento em testes; as capturas anteriores da demo não comprovam a aparência destes componentes novos. A validação visual atual fica com o agente principal.

## Publicação e administração

- Conferir e enviar usa `SubmissionPreview` com o mesmo `LinkRow` público: título, descrição truncada pelo componente compartilhado, rede, categoria, ícone e imagem preparados. Sem imagem, não há área vazia. A variante de rascunho não cria link de saída nem contador de impressões.
- Os bytes dos anexos continuam apenas em memória. O rascunho no armazenamento local contém somente texto/descoberta. A prévia não afirma que o anexo já está aprovado. Cidade não é inventada a partir de um ID: a prévia mostra rede/categoria e idioma/modalidade disponíveis no contrato do formulário.
- A moderação tem aba Anexos separada de Links, Minha página e Links permanentes. Busca/tipo, atualizar, estados de carregamento/erro/vazio, filtro de link e `tab=attachments` usam dados reais. Perda de acesso remove as prévias privadas.
- Anexos reutilizam a apresentação de revisão: indicação/versão, classificação, responsável real, preview privado, aprovar e diálogo de recusa com motivo obrigatório. Recusar mantém eventual anexo aprovado anterior. A decisão de texto permanece independente.
- Cards, resumos, confirmação, configurações, recibos e skeletons próprios da administração usam o material compartilhado. Campos e ações reutilizam as primitivas existentes. Não foram alterados preços, elegibilidade, suspensão, expurgo, consentimento, permissões ou isolamento.

## WhatsApp e persistência

`link-media-events.ts` integra os anexos à outbox `OperationalMessage`, sem nova tabela ou dependência. A proposta cria `REVIEW_MEDIA`; a decisão de painel ou WhatsApp cria `DECISION` junto de auditoria, versão e consumo da referência na mesma transação.

A citação identifica exatamente o aviso enviado. O comando verifica tenant, administrador ativo, operador habilitado, versão/snapshot, prazo e consumo; aprovar anexo não publica nem altera o texto do link. Repetição, corrida com o painel, substituição e referência vencida não duplicam a decisão. O ciclo existente recupera pendências elegíveis e usa o mesmo transporte/retry; não foi criada infraestrutura paralela.

Os avisos destinam-se ao grupo operacional da integração já configurada. Não foi implementado um novo envio ao telefone de quem publicou, nem um e-mail incorreto de “link publicado” para aprovação de imagem. Bytes, URLs privadas de prévia e credenciais não entram nos templates. A imagem é examinada no painel autenticado.

## Evidência executada

- TDD: observadas falhas reais para prévia inexistente, aba inexistente, filtro de anexos, retirada de preview após 403, diálogo de recusa, recuperação de erro da decisão textual e ausência de avisos de anexos.
- Frontend: último lote focado, 17 arquivos e 53 testes passaram. Inclui envio atômico com mídia, armazenamento textual, permissões de envio, prévia com/sem imagem, tabs, filtros, conflitos, recusas e componentes administrativos. ESLint focado passou após remover uma variável de fixture sem uso.
- Backend: 4 arquivos/17 testes passaram na primeira execução (mídia no repositório/HTTP, templates e quatro casos de notificações). Após ampliar para seis casos PostgreSQL, os seis novos testes, revisões de páginas/links permanentes e templates passaram: 29 testes em três arquivos.
- Os seis casos PostgreSQL novos cobrem outbox idempotente, decisão pelo painel, citação e recibo WhatsApp, recusa com motivo preservando anexo anterior, referências expiradas/substituídas/operador revogado, corrida painel/WhatsApp e rollback quando a outbox não pode persistir. Usam tenants UUID próprios, teardown exato e transporte simulado; nenhuma mensagem real foi enviada.
- Uma execução adicional incluiu `evolution-moderation.pg.spec.ts` sem `EVOLUTION_DATABASE_URL`; essa suíte não iniciou. Não foi chamada a rotina global de worker no banco compartilhado, pois ela também processa recibos/e-mails e retenção de outros tenants. Esse erro de configuração não foi apresentado como falha do produto.
- O E2E de mídia foi adaptado para selecionar a aba Anexos e abrir o diálogo antes da justificativa. Não foi executado por este agente; servidor, build, verificação global e navegador ficam coordenados pelo agente principal.

Lote final após a projeção da fila (responsável e facetas reais): backend, 4 arquivos/19 testes passaram; frontend, tabs e fila, 2 arquivos/6 testes passaram. ESLint focado do backend e do frontend passou. O lote anterior completo do escopo frontend permaneceu em 17 arquivos/53 testes aprovados. Foram usados apenas tokens de espaçamento existentes. Compilação e validação visual não são inferidas dos testes de componente.

Correção do fixture CommonJS: a preparação assíncrona da imagem passou do topo do arquivo para `beforeAll`, preservando os seis cenários. Reexecução: seis testes PostgreSQL aprovados; `npm run typecheck` do backend concluído com código zero. Nenhuma fonte de produção ou processo foi alterado por essa correção.
