# Execução F25 — Assistente de criação da página

Autorização: concluir F22 → F23 → F25 e parar. Sem branch nova, commit, push ou deploy. Preservar ajustes locais anteriores.

## S0 — D27, fatos, serviço e alternativas

- Porta nova de planejamento, separada de moderação/embedding, usando OpenAI Chat Completions com JSON Schema estrito. Modelo selecionado: gpt-5.4-nano-2026-03-17, descrito na documentação oficial para classificação/extração/ordenação. Reutiliza transporte fetch/padrão de timeout; nenhuma biblioteca nova. Disponibilidade depende de chave e acesso ao modelo na conta; falha não gera conteúdo fictício. Testes usam adapter/HTTP local determinístico.
- O modelo retorna apenas índices dos fatos fornecidos, grupos de uma taxonomia fixa, ordem dos links e ID de template existente. Bio é composta no servidor com trechos literais selecionados. Não aceitar texto livre que invente certificações, números, credenciais ou benefícios. Usuário pode editar o texto explicitamente, preservando marca de edição manual; publicação continua sujeita à validação/moderação atual. Alternativa de confiar só no prompt rejeitada.
- Enviar ao provedor atividade/fatos informados e rótulos/hosts dos links escolhidos. Metadados dos links não contêm o destino completo; o texto livre informado pela pessoa pode conter URLs/dados que ela própria digitou. Não enviar leads, histórico, identidade da conta, credenciais ou imagens. Não abrir sites para inventar informações. Aviso na etapa de geração informa esse envio. store=false; isso não representa garantia de retenção zero do provedor.
- Até 5 tentativas por conta/dia UTC, reserva técnica de 5.000 micro-USD por tentativa e teto de 25.000 micro-USD/dia. Máximo 6 KB no corpo destinado ao provedor, 1.000 tokens de saída e timeout de 10s; uso e custo estimado registrados a partir de usage. Referência de estimativa em 19/10/2026: USD 0,20 entrada / USD 1,25 saída por milhão de tokens, sem desconto de cache. Não é fatura nem preço cobrado do usuário. Rejeição local de schema não chama provedor; tentativa reservada, falha/timeout ou crash consome a tentativa para evitar abuso. Retry explícito usa nova chave; mesma chave nunca dispara geração duas vezes.
- Sugestões temporárias por 24h; descarte limpa o conteúdo. Uso agregado e metadados operacionais por 180 dias, sem texto/URL. Quota não é restaurada ao apagar sugestão.
- Nome e endereço são informados pela pessoa; sugerir bio, grupos, ordem e aparência usando F16. F17 fornece parser/validação das URLs. Rascunho existente e publicação não mudam na geração/descarte. Aplicação usa versão esperada, campos escolhidos e transação do rascunho; campos omitidos são preservados. Links e grupos existentes não são removidos silenciosamente.
- Permissão global própria assistant: consultar sugestões e o rascunho-base; escrever permite gerar, descartar e aplicar campos ao rascunho. Não concede editor manual ou publicação. Acessos antigos a page continuam sem esse direito, inclusive por causa do consumo de IA. Alternativa de herdar page rejeitada por conceder nova capacidade sem revisão. Read-only permite retomar e consultar a prévia, sem edição/aplicação. Compartilhamento antigo de página não concede geração ou aplicação. Aplicar nunca chama publish, aprovação de catálogo, cobrança ou envio externo.

## Fontes técnicas

[Modelo e tarifas](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs), [política de dados](https://developers.openai.com/api/docs/guides/your-data). Context7 consultado para contrato Chat Completions/response_format/store/usage. Uso de store=false não elimina automaticamente logs de monitoramento do provedor. Disponibilidade real da conta e faturamento não foram testados com chamadas pagas.

## S1–S6 — implementação e provas locais

Domínio: RED comportamental inicial 2 falhas/1 controle; GREEN final 6/6, mais 4/4 do adapter HTTP. Componentes 4/4: revisão seletiva, renderer com dados ocultos fora do DOM, bloqueio durante geração e consulta read-only. Não houve nova biblioteca ou editor paralelo.

HTTP/PG real: 8/8 próprios, T01–T05/I01–I03. JSON fora do schema não vira conteúdo; uso continua contabilizado. Nova página só é salva na aplicação, descarte mantém a anterior, aplicação não publica, replay não aplica duas vezes, versão obsoleta conflita, outro dono/tenant e sessão ausente são negados. Seis gerações concorrentes reservam cinco tentativas e bloqueiam a sexta antes do provedor. Trigger real força falha no recibo final: transação reverte o rascunho e mantém sugestão READY. Campos/links não selecionados permanecem intactos. Destinos são revalidados antes de aplicar.

A primeira rodada PG revelou que o DTO do editor carrega version junto do conteúdo; separar versão antes do schema estrito corrigiu a composição. Outra asserção comparava scheduling.serverNow, um relógio operacional; foi substituída por comparação explícita do conteúdo/estado persistido. Erros são mantidos nos logs, sem mascarar falha real de regra.

Auditoria global distingue o colaborador da conta-alvo. A revisão final detectou que actorId é a identidade de compartilhamento legado usada por assertMembership; reaproveitá-lo negava grants globais válidos. auditActorId, preenchido somente pelo guard do servidor, registra o iniciador sem alterar autorização legada. PG confirma leitura/escrita/revogação e autor real dos eventos. Convites usam seu actor próprio com o mesmo resultado. Não aceitar esse identificador no body.

Playwright próprio: quatro jornadas × desktop/mobile, 8/8, dentro da rodada final 37/37. Revisão editável, refresh obrigatório da prévia após edição, aplicação seletiva, publicação original intacta, descarte, geração sem página, erro de rede/provedor, limite diário, acesso direto, grants sem page, leitura sem mutação, aplicação por colaborador e revogação. Público/API/BFF/PG reais; apenas provedor externo é HTTP fixture determinístico e restrito ao harness local.

Primeira rodada nova: 17/19, com duas falhas de asserção esperando uma frase diferente do conflito existente. Corrigida para a mensagem real; nenhuma regra comercial alterada. Rodada ampla: 80/85; falhas F19 mediam comparação durante animação e quatro F20 esperavam contagens anteriores às duas seções novas. F19 agora aguarda fontes/opacidade final, mantendo tolerância de 2px; F20 confere 14 seções pessoais/23 administrativas e os direitos esperados. Rodada final com todas as features novas, F19 e F20: 37/37. Outros cenários de F09/F12/F16/F17 passaram na rodada ampla. Não somar rodadas sobrepostas. Traces/erros anteriores preservados em docs/frontend-profissional/evidencias/f25-2026-10-19/.

## Fechamento, operação e limites

Backend completo: 598 testes; frontend completo: 413. PG afetados: 19 próprios do lote (F22 5, F23 6, F25 8) após correção de auditoria; regressões PG: 78. Lint/typecheck de ambos com exit 0; build backend aprovado e Next de produção compilado pelo harness em .next-e2e, preservando o .next do usuário. Logs/contagens e hashes: [evidências F25](evidencias-f25.json). Os dois testes Pix inicialmente usaram banco antigo; a repetição com PG/Redis próprios e atualizados passou. Sem conexão de teste ao banco externo.

Migração: prova 54 → 57 migrations em banco descartável separado, com usuário, rascunho e convite aprovado anteriores. Hashes dos quatro registros preservados e segundo deploy sem alterações: [prova](evidencias-migracoes-f22-f25.json). Sem backfill ou alteração destrutiva. EXPLAIN registrado: índices de contato e distribuição utilizados; conjunto pequeno do assistente escolheu scan sequencial. Não é benchmark de volume de produção. Worker atual expurga sugestões expiradas e agregados antigos.

Capturas finais: 14 da F25, em 1280/1440/768/390 e reflow 320px/200%; hashes no JSON. Inspeção nativa desktop/mobile do formulário, revisão, renderer e diálogos; sem cortes/overflow observados. Axe A/AA no main, teclado e foco nos fluxos alterados. Emulação Chromium não comprova aparelho físico nem acessibilidade total; não foram aprovados novos baselines visuais automaticamente. IDs/horários operacionais são reais das fixtures, identificados nas evidências.

Como testar: sem página, Minha página → Criar com ajuda (Recomendado). A rota direta /painel/perfil/assistente permanece conforme os grants; após criar, os menus comuns levam à edição manual. Informar atividade/fatos, escolher links, gerar, editar/selecionar campos, atualizar prévia e aplicar. Revisar e publicar continuam em ações separadas da página. Em ambiente sem chave/acesso ao modelo, mostrar IA indisponível e permitir edição manual; não gerar uma resposta fictícia. A chamada paga e o acesso real da conta ao snapshot do modelo ainda precisam de ensaio autorizado de liberação.

Reversão: retirar a entrada/rotas novas com a versão da aplicação, preservando rascunhos, recibos e uso; não remover a chave compartilhada de moderação para desativar somente o assistente. Não executar DROP/reset. Limites/mensuração do provedor são estimativas técnicas e não representam cobrança ao usuário.

S0–S6 verificadas localmente. S7/CI/implantação/ensaio real do provedor em revisão; banco pessoal e banco externo não foram migrados. Roadmap em 29/42 implementações nos ambientes declarados, 13 restantes. Parada após F25, sem iniciar F28, criar branch, commit, push ou deploy.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.
