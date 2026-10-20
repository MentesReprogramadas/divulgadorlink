# Planejamento auditável das features

Data da análise inicial: 14 de outubro de 2026. Atualização de prioridade: 15 de outubro de 2026.

**Situação atual — 20/10/2026:** 31/42 implementações registradas. F29 validada localmente; próxima sequência F32 → F33 → F10; parar após F10. F39 não iniciada, corrigida a divergência do índice. S7/CI/liberação remotas pendentes. Commits na branch codex/roadmap-f37-testes; sem push/deploy. [Execução F29](execucao-f29.md).

Refinamento solicitado após F21: [importação, resumos, navegação, campanhas, equipe global e apresentação](refinamento-f05-f15-f20-f21-f38.md). Ampliação anterior implementada e validada localmente. Pedido posterior implementou F22 → F23 → F25, conforme situação atual acima.

Este conjunto transforma as 42 features de [features propostas](../features-propostas.md) em uma sequência de entrega, 42 especificações e 42 planos de implementação independentes. **F42 foi concluída em produção. Em 15/10/2026 o usuário autorizou continuar todas as features, com testes e commits em codex/roadmap-features, sem publicar na main. F01 concluída na branch; F06 concluída na branch e F07 concluída na branch, com CI aprovado. Em 16/10/2026 o usuário autorizou somente a próxima feature: F02 concluída na branch com CI aprovado. Nova autorização limitada à F03: concluída na branch com CI aprovado. Autorização posterior incluiu aleatoriedade na F03 e execução da F04, concluídas na branch com CI aprovado. Nova autorização em 16/10/2026 concluiu F09 na branch, com D10 resolvida, critérios/evidências e CI aprovado. Em 16/10/2026 nova autorização retomou a execução contínua: F12 concluída na branch com CI aprovado, aprovação automática e retenção de 50 versões/180 dias. A autorização posterior retomou a execução contínua: F19 validada localmente; F08 validada localmente; F11/F13/F14/F16/F17/F18 também validadas localmente. Execução encerrada após F18 conforme pedido de 18/10; CI/liberação remotos pendentes. As decisões técnicas são registradas com alternativas, conforme pedido mais recente. O AGENTS atual exige autorização específica antes de novos commits, push ou deploy.** Evidências, decisões concretizadas e operação estão em [execução F42](execucao-f42.md).

A fonte foi ampliada por solicitação do usuário com F42; as seções anteriores foram preservadas. Seu SHA256 na leitura de referência é `6CBD63F2210EC98635C3D3643D9826B656EDB091DBED70DAE07783FE12E79B22`. Alteração posterior exige reconciliação explícita, sem renumerar IDs existentes. F01–F41 conservam seus IDs. F42 foi acrescentada e é a primeira feature de execução, após G00 mínimo; números não representam ordem de execução.

## Como navegar

1. [Análise e ordem de entrega](ordem-de-entrega.md).
2. [Arquitetura e reutilização](arquitetura-e-reuso.md).
3. [Estratégia de testes e gates](qualidade-e-testes.md).
4. [Decisões pendentes](decisoes.md).
5. [Roadmap por etapa](roadmap-auditavel.md).
6. [Matriz de aceitação e evidências](matriz-aceitacao.csv).
7. Specs e planos individuais na tabela abaixo.
8. [Auditoria documental realizada](auditoria-documental.md).

As decisões não resolvidas são propostas de desenho, nunca fatos aprovados. Não há preços, SLAs ou estimativas de calendário inventados. Ordem de dependência é obrigatória; prioridade de negócio pode ser revista com registro. A implementação atual parou após F25. As notas datadas anteriores preservam o histórico de autorizações e paradas. F09 e F12 concluídas na branch, com decisões registradas em [execução F12](execucao-f12.md). Ver também [execução F09](execucao-f09.md). Evidências e decisões ficam em [execução contínua](execucao-roadmap.md). Deploy e cobrança reais não são consequência automática dos commits nessa branch.

## Índice e sequência única

| Ordem | ID | Onda | Spec | Plano | Pré-requisitos | Execução |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | F42 | P0 | [Moderação e alertas operacionais no grupo pela Evolution API](specs/f42-evolution-moderacao.md) | [Implementação](planos/f42-evolution-moderacao.md) | G00 mínimo + base existente | CONCLUÍDA |
| 2 | F01 | 1 | [Relatório de resultado do destaque](specs/f01-resultado-destaque.md) | [Implementação](planos/f01-resultado-destaque.md) | F42 (prioridade); G00 + base existente | CONCLUÍDA NA BRANCH |
| 3 | F06 | 1 | [Denunciar um link](specs/f06-denuncias.md) | [Implementação](planos/f06-denuncias.md) | F42 (prioridade); G00 + base existente | CONCLUÍDA NA BRANCH |
| 4 | F07 | 1 | [Acompanhamento de disponibilidade](specs/f07-disponibilidade.md) | [Implementação](planos/f07-disponibilidade.md) | F42 (prioridade); G00 + base existente | CONCLUÍDA NA BRANCH |
| 5 | F02 | 2 | [Lembrete de renovação](specs/f02-lembrete-renovacao.md) | [Implementação](planos/f02-lembrete-renovacao.md) | F42 (prioridade); F01 | CONCLUÍDA NA BRANCH |
| 6 | F03 | 2 | [Links relacionados](specs/f03-links-relacionados.md) | [Implementação](planos/f03-links-relacionados.md) | F42 (prioridade); G00 + base existente | CONCLUÍDA NA BRANCH |
| 7 | F04 | 2 | [Favoritos e coleções](specs/f04-favoritos-colecoes.md) | [Implementação](planos/f04-favoritos-colecoes.md) | F42 (prioridade); G00 + base existente | CONCLUÍDA NA BRANCH |
| 8 | F09 | 2 | [Perfil público com categorias próprias](specs/f09-perfil-publico.md) | [Implementação](planos/f09-perfil-publico.md) | F42 (prioridade); G00 + base existente | CONCLUÍDA NA BRANCH |
| 9 | F12 | 2 | [Link permanente para convites](specs/f12-link-permanente.md) | [Implementação](planos/f12-link-permanente.md) | F42 (prioridade); F07 | CONCLUÍDA NA BRANCH |
| 10 | F19 | 2 | [Prévia e histórico de versões](specs/f19-historico-versoes.md) | [Implementação](planos/f19-historico-versoes.md) | F42 (prioridade); F09 | VALIDADA LOCALMENTE; S7 EM REVISÃO |
| 11 | F08 | 3 | [Painel de oportunidades de busca](specs/f08-oportunidades-busca.md) | [Implementação](planos/f08-oportunidades-busca.md) | F42 (prioridade); G00 + base existente | VALIDADA LOCALMENTE; S7 EM REVISÃO |
| 12 | F11 | 3 | [Planos para perfis e páginas](specs/f11-planos-perfis.md) | [Implementação](planos/f11-planos-perfis.md) | F42 (prioridade); F09 | VALIDADA LOCALMENTE; S7 EM REVISÃO |
| 13 | F13 | 3 | [QR Code permanente](specs/f13-qr-permanente.md) | [Implementação](planos/f13-qr-permanente.md) | F42 (prioridade); F09, F12 | S0–S6 LOCAL; S7 EM REVISÃO |
| 14 | F14 | 3 | [Agendamento de links](specs/f14-agendamento.md) | [Implementação](planos/f14-agendamento.md) | F42 (prioridade); F09, F11 | S0–S6 LOCAL; S7 EM REVISÃO |
| 15 | F16 | 3 | [Templates por atividade](specs/f16-templates.md) | [Implementação](planos/f16-templates.md) | F42 (prioridade); F09, F19 | S0–S6 LOCAL; S7 EM REVISÃO |
| 16 | F17 | 3 | [Importação em lote](specs/f17-importacao-lote.md) | [Implementação](planos/f17-importacao-lote.md) | F42 (prioridade); F09 | S0–S6 LOCAL; S7 EM REVISÃO |
| 17 | F18 | 3 | [Busca dentro do perfil](specs/f18-busca-perfil.md) | [Implementação](planos/f18-busca-perfil.md) | F42 (prioridade); F09, F14 | S0–S6 LOCAL; S7 EM REVISÃO |
| 18 | F27 | 3 | [Filtros por cidade idioma e modalidade](specs/f27-filtros-locais.md) | [Implementação](planos/f27-filtros-locais.md) | F42 (prioridade); G00 + base existente | S0–S6 LOCAL; S7 EM REVISÃO |
| 19 | F31 | 3 | [Mapa de interação da página](specs/f31-interacao-pagina.md) | [Implementação](planos/f31-interacao-pagina.md) | F42 (prioridade); F09, F19 | S0–S6 LOCAL; S7 EM REVISÃO |
| 20 | F34 | 3 | [Checklist de publicação](specs/f34-checklist-publicacao.md) | [Implementação](planos/f34-checklist-publicacao.md) | F42 (prioridade); F09 | S0–S6 LOCAL; S7 EM REVISÃO |
| 21 | F37 | 3 | [Botão com alternativas de acesso](specs/f37-alternativas-acesso.md) | [Implementação](planos/f37-alternativas-acesso.md) | F42 (prioridade); F09, F12, F19 | S0–S6 LOCAL; S7 EM REVISÃO |
| 22 | F38 | 3 | [Exportação do perfil](specs/f38-exportacao-perfil.md) | [Implementação](planos/f38-exportacao-perfil.md) | F42 (prioridade); F09, F19 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 23 | F05 | 4 | [Seguir nichos](specs/f05-seguir-nichos.md) | [Implementação](planos/f05-seguir-nichos.md) | F42 (prioridade); F02 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 24 | F15 | 4 | [Página por campanha](specs/f15-pagina-campanha.md) | [Implementação](planos/f15-pagina-campanha.md) | F42 (prioridade); F09, F19 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 25 | F20 | 4 | [Equipe e permissões](specs/f20-equipe-permissoes.md) | [Implementação](planos/f20-equipe-permissoes.md) | F42 (prioridade); F09 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 26 | F21 | 4 | [Mídia kit do divulgador](specs/f21-midia-kit.md) | [Implementação](planos/f21-midia-kit.md) | F42 (prioridade); F09, F01 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 27 | F22 | 4 | [Formulário de contato na página](specs/f22-formulario-contato.md) | [Implementação](planos/f22-formulario-contato.md) | F42 (prioridade); F09, F20 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 28 | F23 | 4 | [Distribuidor de convites](specs/f23-distribuidor-convites.md) | [Implementação](planos/f23-distribuidor-convites.md) | F42 (prioridade); F12 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 29 | F25 | 4 | [Assistente de criação de perfil](specs/f25-assistente-perfil.md) | [Implementação](planos/f25-assistente-perfil.md) | F42 (prioridade); F09, F16, F17 | S0–S6 LOCAIS; S7 EM REVISÃO |
| 30 | F28 | 4 | [Comprovação de propriedade](specs/f28-comprovacao-propriedade.md) | [Implementação](planos/f28-comprovacao-propriedade.md) | F42 (prioridade); F12 | S0–S6 LOCAL; S7 EM REVISÃO |
| 31 | F29 | 4 | [Página de evento](specs/f29-evento.md) | [Implementação](planos/f29-evento.md) | F42 (prioridade); F09, F14 | S0–S6 LOCAL; S7 EM REVISÃO |
| 32 | F32 | 4 | [Kit de divulgação](specs/f32-kit-divulgacao.md) | [Implementação](planos/f32-kit-divulgacao.md) | F42 (prioridade); F09, F13 | NÃO INICIADA |
| 33 | F33 | 4 | [Coleções públicas compartilháveis](specs/f33-colecoes-publicas.md) | [Implementação](planos/f33-colecoes-publicas.md) | F42 (prioridade); F04 | NÃO INICIADA |
| 34 | F10 | 5 | [Página premium com subdomínio](specs/f10-pagina-premium-subdominio.md) | [Implementação](planos/f10-pagina-premium-subdominio.md) | F42 (prioridade); F09, F11, F19, F16 | NÃO INICIADA |
| 35 | F24 | 5 | [Descoberta de perfis](specs/f24-descoberta-perfis.md) | [Implementação](planos/f24-descoberta-perfis.md) | F42 (prioridade); F09, F03 | NÃO INICIADA |
| 36 | F30 | 5 | [Integrações e avisos automáticos](specs/f30-integracoes-webhooks.md) | [Implementação](planos/f30-integracoes-webhooks.md) | F42 (prioridade); F22, F02 | NÃO INICIADA |
| 37 | F35 | 5 | [Central de contatos recebidos](specs/f35-central-contatos.md) | [Implementação](planos/f35-central-contatos.md) | F42 (prioridade); F22, F20 | NÃO INICIADA |
| 38 | F39 | 5 | [Página em vários idiomas](specs/f39-multilingue.md) | [Implementação](planos/f39-multilingue.md) | F42 (prioridade); F09, F19 | NÃO INICIADA |
| 39 | F26 | 6 | [Teste de versões de botões](specs/f26-teste-botoes.md) | [Implementação](planos/f26-teste-botoes.md) | F42 (prioridade); F09, F31 | NÃO INICIADA |
| 40 | F36 | 6 | [Pacotes para agências](specs/f36-agencias.md) | [Implementação](planos/f36-agencias.md) | F42 (prioridade); F20, F11, F21 | NÃO INICIADA |
| 41 | F40 | 6 | [Diagnóstico da página](specs/f40-diagnostico.md) | [Implementação](planos/f40-diagnostico.md) | F42 (prioridade); F09, F07, F31 | NÃO INICIADA |
| 42 | F41 | 6 | [App instalável](specs/f41-pwa.md) | [Implementação](planos/f41-pwa.md) | F42 (prioridade); F09 | NÃO INICIADA |

## Regras de rastreabilidade

- Cada obrigação rastreada recebe ID estável Fxx-ACnn. São 226 critérios: os 200 anteriores preservados e 26 de F42. Na origem são 222 obrigações explícitas e quatro critérios de F11 derivados da tabela comercial.
- Cada feature também tem cenários específicos `U01`, `I01`, `E01` e cenários de componente, segurança e falha. Não confundir cobertura planejada com testes implementados.
- Todo AC aponta para seu caso de contrato `Fxx-Tnn`; a matriz define camada e evidência. A execução deve criar um teste com esse título/ID, entrada/estado da fixture da spec e uma asserção observável da obrigação; citar o AC em comentário não basta.
- Etapas `Fxx-S0` a `Fxx-S7` têm gates e entregáveis. Só mudar para concluída com evidência da etapa, nunca por existência deste texto.
- Criar uma linha de evidência por execução, preservando histórico de falhas. Não sobrescrever resultado anterior como se nunca tivesse falhado.
- Referências a arquivos da aplicação são relativas à raiz do repositório; caminhos marcados propostos não existem ainda.

## Limites da análise

Na análise documental inicial, código e configuração foram lidos sem presumir a suíte verde. As execuções autorizadas posteriormente, até F03, possuem resultados e CI nos registros por feature. Mudanças locais preexistentes no backend, frontend e testes foram preservadas. Planos antigos em `docs/superpowers` são contexto histórico; o código atual prevalece sobre descrições de uma aplicação de referência.

A análise inicial foi documental. Para as features concluídas, revisão visual, testes executados e decisões concretizadas constam nos registros de execução; para as demais, continuam sendo gates futuros.


Atualização de 18/10/2026: F27, F31, F34 e F37 S0–S6 verificadas localmente. Execução encerrada na F37 por pedido mais recente; próxima F38, ainda não iniciada. A continuação anterior até F23 foi revogada. [Registro F27](execucao-f27.md). Git/deploy não executados nesta retomada.

Checkpoint F31: 19 das 42 features têm implementação concluída no seu ambiente declarado; F42 em produção, as demais conforme os registros históricos/locais. [F31](execucao-f31.md) tem cinco ACs locais e 152 E2E de regressão aprovados; S7 mantém PG REG-F03-001 e CI/liberação pendentes. Não equivale a 19 features publicadas em produção.

Checkpoint histórico F34: 20/42 implementações concluídas nos ambientes declarados, incluindo [F34](execucao-f34.md) localmente; S7 global/remoto em revisão. Naquele checkpoint, próxima F37; continuação até F23 posteriormente revogada pelo pedido de parar na F37. Não equivale a vinte features em produção.

Checkpoint F37: 21/42 implementações nos ambientes declarados, incluindo [F37](execucao-f37.md) localmente; não equivale a 21 publicadas em produção. Parada atendida após F37. Restam 21 features, a partir de F38; F25 continua não iniciada.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.
