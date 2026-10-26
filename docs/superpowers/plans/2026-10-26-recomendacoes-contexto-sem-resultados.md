# Recomendações quando a busca reconhece o contexto

Pedido autorizado: recomendar links relacionados quando a interpretação reconhece nichos/redes, mas o assunto específico não retorna links; preservar confirmação +18 e publicar na main/produção.

O grafo e o código confirmam que resultados e sugestões compartilham loadCandidates. Hoje uma consulta semantic usa apenas relevância textual/vetorial. Sem correspondência elegível, a resposta fica vazia apesar de reconhecer facetas públicas.

1. Reproduzir a lacuna nas duas rotas, incluindo contexto adulto, sem vetor e ausência de contexto. Preservar a regressão que prioriza assunto específico quando encontra resultado.
2. Em loadCandidates, quando a consulta específica não tem elegíveis e possui contexto, buscar pelo mesmo escopo de facetas usando a composição existente. Sem novo modelo, tabela de termos ou alteração de limiar. Manter filtros, tenant, publicação, suspensão, patrocínio e visibilidade por idade.
3. Confirmar proteções com SQL real e jornada desktop/mobile. Fixtures controladas passam a simular a classificação semantic sem correspondência que ocorreu em produção; nenhum material adulto real será aberto.
4. Validar lint/tipos/testes/build, publicar somente o diff desta correção sobre a main atual, aguardar CI e conferir o SHA dos três serviços e as respostas públicas após o deploy.

Limites: recomendações serão mais amplas que o assunto específico, mas permanecerão no contexto reconhecido. Sem contexto ou links elegíveis, manter vazio. Falhas de provedor continuam com o tratamento existente. Não há migration, dependência ou mudança de interface.

## Complemento pedido durante a validação

O usuário identificou categorias demais antes dos links e lentidão no autocomplete (288 ms de rede para um prefixo). A UI ainda aguardava 350 ms antes dessa chamada. A main 14b4893e passou nos 22 grupos de qualidade, mas sua publicação foi retida para integrar o complemento. A inspeção posterior confirmou que a secret já estava configurada: o job automático falhou por exigir um ID interno não devolvido pelo Coolify.

- Priorizar links no DOM e no teclado; categorias permanecem depois, também abaixo dos cards na página de resultados. Reusar a apresentação Ondas existente.
- Sugestões rápidas após 150 ms, sem IA/embeddings, com as mesmas validações públicas. Quando faltarem links rápidos e a idade não bloquear a resposta, agendar interpretação após mais 350 ms de pausa. Novas teclas, Escape, blur e mudança de filtros cancelam chamadas/agendamentos antigos. A atualização de opções limpa a seleção ativa para impedir navegação a outro destino.
- Paralelizar leituras independentes de configuração, facetas, contagens e mídia; preservar no-store e reavaliar idade em cada requisição. Não adicionar cache de respostas dependentes da idade.
- Comparar tempos antes/depois pelo mesmo cliente, sem prometer latência de rede fixa; regressões de ordenação/progressão/cancelamento/maioridade e inspeção real em desktop/mobile antes do novo CI e deploy.

Após os 22 grupos também passarem em 025614b0, a aplicação foi publicada pelo Coolify. A compatibilidade do CD usa UUIDs verificados quando não há ID interno e bloqueia qualquer entrada de fila sem identidade suficiente. Oito testes do deploy e três da lease passaram, preservando os bloqueios antes de mutações. O próximo push da correção do CD exige seu próprio CI e deve provar a publicação automática.
