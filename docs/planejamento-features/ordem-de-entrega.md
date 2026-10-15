# Análise e ordem de entrega

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

