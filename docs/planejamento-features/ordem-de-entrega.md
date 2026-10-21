# Análise e ordem de entrega

**Estado atual — 21/10/2026:** parada após F36 concluída localmente; F40/F41 não iniciadas. Total 40/42 implementações locais, S7 pendente. [Guia local](testar-lote-2026-10-21.md), [execução final](execucao-f36.md). Os registros datados abaixo preservam o histórico.


## Resultado da análise

O backlog mistura melhorias sobre produto existente, novas capacidades de perfil e expansões profissionais. Implementar na ordem em que ideias apareceram criaria retrabalho: página premium depende de perfis, publicação e capacidades comerciais; testes de botões dependem de instrumentação por perfil; agências dependem de permissões e de cobrança; contatos dependem de formulário e de acesso específico.

As prioridades anteriores da fonte eram listas locais, não um grafo único. A tabela do README e o roadmap são a sequência consolidada proposta. As seções anteriores da origem permanecem preservadas; a revisão de 15 de outubro acrescenta F42 e atualiza a prioridade com novo hash auditável. Dependências são gates técnicos; preços, consentimento, retenção e política de hosts continuam decisões pendentes, conforme [registro](decisoes.md).

## Onda 0 e gate G00

Antes de qualquer feature: registrar baseline da revisão, reconciliar arquivos locais, provar execução das suítes atuais em ambiente descartável e preparar rastreabilidade, descoberta dos testes e fixtures. G00 não é uma feature adicional nem uma refatoração geral. Detalhes e checklist estão no roadmap e em qualidade.

## Ondas e resultado mínimo

| Onda | Resultado | Features em sequência |
| --- | --- | --- |
| P0 | Moderação e alertas Evolution, primeira feature após G00 mínimo | F42 |
| 1 | Confiabilidade e valor do catálogo | F01 → F06 → F07 |
| 2 | Retorno e núcleo de perfil | F02 → F03 → F04 → F09 → F12 → F19 |
| 3 | Instrumentação, composição e capacidades | F08 → F11 → F13 → F14 → F16 → F17 → F18 → F27 → F31 → F34 → F37 → F38 |
| 4 | Ferramentas de divulgação e operação | F05 → F15 → F20 → F21 → F22 → F23 → F25 → F28 → F29 → F32 → F33 |
| 5 | Publicação avançada e contatos | F10 → F24 → F30 → F35 → F39 |
| 6 | Expansões condicionadas a volume e operação | F26 → F36 → F40 → F41 |

## Prioridade operacional solicitada em 15 de outubro de 2026

 F42 é a primeira entrega, sem depender de F30 ou das decisões comerciais das demais features. G00 mínimo prepara somente os testes necessários à integração. Depois de F42-S7 aceita, seguem F01–F41 na ordem anterior. Esse gate é de sequência, não dependência funcional de WhatsApp. Não ampliar G00 para adiar F42 com uma refatoração geral.

## Por que essa ordem

- F01 demonstra valor com métricas existentes; F06 e F07 melhoram qualidade antes de ampliar distribuição.
- F09 cria perfil mínimo com rascunho/projeção pública; F19 acrescenta histórico. Não fazer F09 depender de F19 completo: isso criaria ciclo.
- F12 cria identidade permanente do endereço; F13 gera QR dessa identidade, F23 distribui os destinos e F37 oferece escolha explícita de canal.
- F31 cria métricas de perfil sem IDs de link fictícios. F26 e F40 usam esses dados depois.
- F11 define versões de plano e capacidades; F10 usa essas capacidades depois. A cobrança não depende da página premium já existir: sua habilitação comercial fica bloqueada até capacidade correspondente estar pronta.
- F20 define permissões por recurso; F35 aplica atendimento a dados pessoais e F36 acrescenta gestão de clientes.
- F16 entrega templates antes da assistência de F25. A assistência monta os mesmos blocos, não cria um editor paralelo.
- F34 ajuda a concluir publicação com as regras de F09; F32 incentiva compartilhamento usando F13.
- F41 fica depois do núcleo: instalação é útil com uso recorrente e não substitui trabalho sobre publicação e descoberta.

## Política de avanço

Onda seguinte só é liberada quando seus pré-requisitos e critérios de saída necessários estiverem concluídos. Uma feature sem relação de dependência pode ser antecipada por decisão registrada, conservando o grafo e o contexto compartilhado. Não atribuir datas sem estimativa baseada em capacidade e revisão de cada plano.

O MVP proposto de perfis termina em F09, F12, F19, F13, F14, F16, F18, F31 e F34, além dos gates aplicáveis. Comercializar funcionalidades ausentes é proibido: a matriz de capacidades precisa refletir somente entregas habilitadas. MVP é proposta de recorte, não remoção das demais 41 specs, além de F42 prioritária.

## Critérios para repriorizar

Registrar data, motivo, evidência de demanda, custo de dependências, IDs afetados, decisão e responsável. Atualizar ordem no README e roadmap no mesmo conjunto de alterações. Não alterar o ID da feature para encaixá-la na nova posição. Não omitir testes, segurança ou migração para cumprir uma prioridade.


## Reconciliação F37 e parada atual

18/10/2026: F37 associa metadata às revisões F19 e reutiliza sua imutabilidade/retenção; por isso F19 passou a ser dependência técnica explícita, além de F09/F12. F31 é condicional para medição conforme capacidade/consentimento. A ordem das 42 features não mudou. Execução encerrada após F37 por pedido mais recente; próxima F38, sem iniciar outras etapas. [Decisão D39 e fechamento](execucao-f37.md).

## 19/10/2026 — Continuidade até F21

Pedido vigente substitui a parada histórica após F37. F38 e F05 validadas localmente, conforme seus registros; seguir F15 → F20 → F21 e parar. Sem autorização nova de commit/push/deploy. S7/CI/liberação não presumidos.


## 19/10/2026 — Encerramento na F21

Sequência F38 → F05 → F15 → F20 → F21 concluída localmente, com specs/planos/matriz/evidências atualizados. Parada atendida após F21, sem iniciar F22. Próxima implementação planejada é F22, dependente de nova continuação do usuário. S7/CI/liberação remotas não executadas. Sem novos commits, push ou deploy. [F20](execucao-f20.md) · [F21](execucao-f21.md).


## Refinamento solicitado após F21 — 19/10/2026

Implementação e decisões: [refinamento F05/F15/F20/F21/F38](refinamento-f05-f15-f20-f21-f38.md). Inclui importação JSON confirmada para rascunho, resumos com frequência no modal e desligamento direto, sidebar por contexto, prévia de campanha preservando o formulário, equipe global com leitura/escrita por recurso e apresentação para parceiros com métricas objetivas.

Não inicia uma nova feature da sequência: mantém 26/42 implementações e F22 não iniciada. Gates locais e evidências da ampliação estão no registro vinculado; S7/CI/liberação remotas continuam EM REVISÃO. Sem nova branch, commit, push ou deploy; alterações existentes preservadas.

## 19/10/2026 — sequência F22 → F23 → F25 encerrada

29/42 implementações nos ambientes declarados; 13 restantes. F22 (contatos), F23 (distribuição) e F25 (assistente) verificadas localmente até S6. Parada após F25 conforme pedido, sem iniciar F28. [F22](execucao-f22.md) · [F23](execucao-f23.md) · [F25](execucao-f25.md). S7/CI/liberação remota em revisão; não apagar pendências históricas. Sem branch, commit, push ou deploy novos; banco pessoal e ambiente externo preservados. Migrations prontas e verificadas em bancos descartáveis, ainda dependem de aplicação no ambiente alvo autorizado.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.


## 20/10/2026 — F28 concluída localmente

[Execução, decisões e provas](execucao-f28.md). Checkpoint inicial 0d0a32b preservou todas as alterações locais. F39 corrigida para não iniciada. 30/42 implementações locais; próximo F29 → F32 → F33 → F10 por autorização vigente, sem parar na primeira feature. S7 remoto em revisão; sem push/deploy.


## 20/10/2026 — F29 validada localmente

[Evento na página: contrato, ACs, decisões e provas](execucao-f29.md). 31/42 implementações registradas. Próxima sequência F32 → F33 → F10; parar após F10; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


## 20/10/2026 — F32 validada localmente

[Kit de divulgação: contrato, ACs, decisões e provas](execucao-f32.md). 32/42 implementações registradas. Próxima sequência F33 → F10; parar após F10; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


## 20/10/2026 — F33 validada localmente

[Coleções públicas compartilháveis: contrato, ACs, decisões e provas](execucao-f33.md). 33/42 implementações registradas. Próxima sequência F10; parar após F10; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


## 20/10/2026 — F10 validada localmente

[Página premium com subdomínio: contrato, ACs, decisões e provas](execucao-f10.md). 34/42 implementações registradas. Próxima sequência parada solicitada após F10; próximas futuras F24 → F30 → F35 → F39 → F26 → F36 → F40 → F41; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


### Fechamento F10 — limite da validação

Implementação/automação locais concluídas, AC03 parcial e F10-M01 (TLS/DNS real em staging) pendente. CI/deploy não executados. Parada solicitada após F10: não iniciar F24. [Operação e reversão](operacao-f10.md).


## Continuidade autorizada em 21/10/2026

A instrução de continuar as features restantes substitui a parada anterior após F10. F24 e F30 implementadas e validadas localmente; F35 em execução. Registros em [F24](execucao-f24.md) e [F30](execucao-f30.md). S7/CI remotos, commit, push e deploy desta rodada não executados. Não interpretar os registros históricos de parada como estado atual.

## Encerramento após F36 — 21/10/2026

Pedido posterior do usuário: concluir a feature atual, atualizar documentação, explicar teste/configuração e parar. F36 concluída localmente; **não iniciar F40/F41**. Lote entregue: F24 → F30 → F35 → F39 → F26 → F36. Total 40/42 implementações locais, com S7 em revisão. Próxima sequência somente após nova autorização: F40 → F41. Não há novo commit/push/deploy desta rodada. [Guia de teste](testar-lote-2026-10-21.md), [execução F36](execucao-f36.md), [contexto para retomada](contexto-apos-f36.md). Registros anteriores de execução contínua são históricos e não superam este pedido de parada.
