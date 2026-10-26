# Recomendações quando a busca reconhece o contexto

Pedido autorizado: recomendar links relacionados quando a interpretação reconhece nichos/redes, mas o assunto específico não retorna links; preservar confirmação +18 e publicar na main/produção.

O grafo e o código confirmam que resultados e sugestões compartilham loadCandidates. Hoje uma consulta semantic usa apenas relevância textual/vetorial. Sem correspondência elegível, a resposta fica vazia apesar de reconhecer facetas públicas.

1. Reproduzir a lacuna nas duas rotas, incluindo contexto adulto, sem vetor e ausência de contexto. Preservar a regressão que prioriza assunto específico quando encontra resultado.
2. Em loadCandidates, quando a consulta específica não tem elegíveis e possui contexto, buscar pelo mesmo escopo de facetas usando a composição existente. Sem novo modelo, tabela de termos ou alteração de limiar. Manter filtros, tenant, publicação, suspensão, patrocínio e visibilidade por idade.
3. Confirmar proteções com SQL real e jornada desktop/mobile. Fixtures controladas passam a simular a classificação semantic sem correspondência que ocorreu em produção; nenhum material adulto real será aberto.
4. Validar lint/tipos/testes/build, publicar somente o diff desta correção sobre a main atual, aguardar CI e conferir o SHA dos três serviços e as respostas públicas após o deploy.

Limites: recomendações serão mais amplas que o assunto específico, mas permanecerão no contexto reconhecido. Sem contexto ou links elegíveis, manter vazio. Falhas de provedor continuam com o tratamento existente. Não há migration, dependência ou mudança de interface.
