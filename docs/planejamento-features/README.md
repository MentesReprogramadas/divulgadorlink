# Planejamento auditável das features

Data da análise inicial: 14 de outubro de 2026. Atualização de prioridade: 15 de outubro de 2026.

Este conjunto transforma as 42 features de [features propostas](../features-propostas.md) em uma sequência de entrega, 42 especificações e 42 planos de implementação independentes. **O usuário autorizou executar somente P0/F42 e parar. F42 foi concluída e ativada em produção; F01–F41 permanecem não iniciadas.** Evidências, decisões concretizadas e operação estão em [execução F42](execucao-f42.md).

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

As decisões não resolvidas são propostas de desenho, nunca fatos aprovados. Não há preços, SLAs ou estimativas de calendário inventados. Ordem de dependência é obrigatória; prioridade de negócio pode ser revista com registro. A autorização de execução posterior abrange somente F42, incluindo configuração no Coolify. Não autoriza iniciar as demais features.

## Índice e sequência única

| Ordem | ID | Onda | Spec | Plano | Pré-requisitos | Execução |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | F42 | P0 | [Moderação e alertas operacionais no grupo pela Evolution API](specs/f42-evolution-moderacao.md) | [Implementação](planos/f42-evolution-moderacao.md) | G00 mínimo + base existente | CONCLUÍDA |
| 2 | F01 | 1 | [Relatório de resultado do destaque](specs/f01-resultado-destaque.md) | [Implementação](planos/f01-resultado-destaque.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 3 | F06 | 1 | [Denunciar um link](specs/f06-denuncias.md) | [Implementação](planos/f06-denuncias.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 4 | F07 | 1 | [Acompanhamento de disponibilidade](specs/f07-disponibilidade.md) | [Implementação](planos/f07-disponibilidade.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 5 | F02 | 2 | [Lembrete de renovação](specs/f02-lembrete-renovacao.md) | [Implementação](planos/f02-lembrete-renovacao.md) | F42 (prioridade); F01 | NÃO INICIADA |
| 6 | F03 | 2 | [Links relacionados](specs/f03-links-relacionados.md) | [Implementação](planos/f03-links-relacionados.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 7 | F04 | 2 | [Favoritos e coleções](specs/f04-favoritos-colecoes.md) | [Implementação](planos/f04-favoritos-colecoes.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 8 | F09 | 2 | [Perfil público com categorias próprias](specs/f09-perfil-publico.md) | [Implementação](planos/f09-perfil-publico.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 9 | F12 | 2 | [Link permanente para convites](specs/f12-link-permanente.md) | [Implementação](planos/f12-link-permanente.md) | F42 (prioridade); F07 | NÃO INICIADA |
| 10 | F19 | 2 | [Prévia e histórico de versões](specs/f19-historico-versoes.md) | [Implementação](planos/f19-historico-versoes.md) | F42 (prioridade); F09 | NÃO INICIADA |
| 11 | F08 | 3 | [Painel de oportunidades de busca](specs/f08-oportunidades-busca.md) | [Implementação](planos/f08-oportunidades-busca.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 12 | F11 | 3 | [Planos para perfis e páginas](specs/f11-planos-perfis.md) | [Implementação](planos/f11-planos-perfis.md) | F42 (prioridade); F09 | NÃO INICIADA |
| 13 | F13 | 3 | [QR Code permanente](specs/f13-qr-permanente.md) | [Implementação](planos/f13-qr-permanente.md) | F42 (prioridade); F09, F12 | NÃO INICIADA |
| 14 | F14 | 3 | [Agendamento de links](specs/f14-agendamento.md) | [Implementação](planos/f14-agendamento.md) | F42 (prioridade); F09 | NÃO INICIADA |
| 15 | F16 | 3 | [Templates por atividade](specs/f16-templates.md) | [Implementação](planos/f16-templates.md) | F42 (prioridade); F09, F19 | NÃO INICIADA |
| 16 | F17 | 3 | [Importação em lote](specs/f17-importacao-lote.md) | [Implementação](planos/f17-importacao-lote.md) | F42 (prioridade); F09 | NÃO INICIADA |
| 17 | F18 | 3 | [Busca dentro do perfil](specs/f18-busca-perfil.md) | [Implementação](planos/f18-busca-perfil.md) | F42 (prioridade); F09, F14 | NÃO INICIADA |
| 18 | F27 | 3 | [Filtros por cidade idioma e modalidade](specs/f27-filtros-locais.md) | [Implementação](planos/f27-filtros-locais.md) | F42 (prioridade); G00 + base existente | NÃO INICIADA |
| 19 | F31 | 3 | [Mapa de interação da página](specs/f31-interacao-pagina.md) | [Implementação](planos/f31-interacao-pagina.md) | F42 (prioridade); F09, F19 | NÃO INICIADA |
| 20 | F34 | 3 | [Checklist de publicação](specs/f34-checklist-publicacao.md) | [Implementação](planos/f34-checklist-publicacao.md) | F42 (prioridade); F09 | NÃO INICIADA |
| 21 | F37 | 3 | [Botão com alternativas de acesso](specs/f37-alternativas-acesso.md) | [Implementação](planos/f37-alternativas-acesso.md) | F42 (prioridade); F09, F12 | NÃO INICIADA |
| 22 | F38 | 3 | [Exportação do perfil](specs/f38-exportacao-perfil.md) | [Implementação](planos/f38-exportacao-perfil.md) | F42 (prioridade); F09, F19 | NÃO INICIADA |
| 23 | F05 | 4 | [Seguir nichos](specs/f05-seguir-nichos.md) | [Implementação](planos/f05-seguir-nichos.md) | F42 (prioridade); F02 | NÃO INICIADA |
| 24 | F15 | 4 | [Página por campanha](specs/f15-pagina-campanha.md) | [Implementação](planos/f15-pagina-campanha.md) | F42 (prioridade); F09, F19 | NÃO INICIADA |
| 25 | F20 | 4 | [Equipe e permissões](specs/f20-equipe-permissoes.md) | [Implementação](planos/f20-equipe-permissoes.md) | F42 (prioridade); F09 | NÃO INICIADA |
| 26 | F21 | 4 | [Mídia kit do divulgador](specs/f21-midia-kit.md) | [Implementação](planos/f21-midia-kit.md) | F42 (prioridade); F09, F01 | NÃO INICIADA |
| 27 | F22 | 4 | [Formulário de contato na página](specs/f22-formulario-contato.md) | [Implementação](planos/f22-formulario-contato.md) | F42 (prioridade); F09, F20 | NÃO INICIADA |
| 28 | F23 | 4 | [Distribuidor de convites](specs/f23-distribuidor-convites.md) | [Implementação](planos/f23-distribuidor-convites.md) | F42 (prioridade); F12 | NÃO INICIADA |
| 29 | F25 | 4 | [Assistente de criação de perfil](specs/f25-assistente-perfil.md) | [Implementação](planos/f25-assistente-perfil.md) | F42 (prioridade); F09, F16, F17 | NÃO INICIADA |
| 30 | F28 | 4 | [Comprovação de propriedade](specs/f28-comprovacao-propriedade.md) | [Implementação](planos/f28-comprovacao-propriedade.md) | F42 (prioridade); F12 | NÃO INICIADA |
| 31 | F29 | 4 | [Página de evento](specs/f29-evento.md) | [Implementação](planos/f29-evento.md) | F42 (prioridade); F09, F14 | NÃO INICIADA |
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

Código e configuração atuais foram lidos; a suíte existente não foi executada e seu estado verde não foi presumido. Mudanças locais preexistentes no backend, frontend e testes foram preservadas. Planos antigos em `docs/superpowers` são contexto histórico; o código atual prevalece sobre descrições de uma aplicação de referência.

A revisão realizada neste trabalho é documental: inventário, dependências, correspondência fonte/spec/plano/roadmap e links locais. A revisão visual de telas, a validação por execução e as decisões de produto são gates futuros.

