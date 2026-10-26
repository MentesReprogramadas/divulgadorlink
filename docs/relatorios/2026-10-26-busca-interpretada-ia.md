# Busca interpretada por IA e origem do Coolify

## Comportamento

A interpretação principal usa OpenAI com a consulta e os nomes/slugs dos nichos e redes públicos do tenant. Não depende da tabela de exemplos da entrega anterior. Gírias, erros de escrita e frases são relacionados à taxonomia atual, incluindo categorias novas. O resultado estruturado é validado e não pode inventar slugs ou destinos.

Consultas de categoria/rede completas podem usar os links elegíveis dessas facetas sem vetor. Assuntos mais específicos usam a consulta interpretada e embeddings, exigindo relevância dentro das facetas escolhidas. Sugestões e resultados compartilham esse contexto. O SQL continua parametrizado, com publicação, tenant, idade, descoberta, relevância e patrocínio preservados. A IA interpreta intenção; não concede aprovação ou permissão.

A interpretação tem timeout de cinco segundos, saída de até 400 tokens, entrada de consulta de até 300 caracteres, corpo de 48 KB e resposta limitada a 16 KB. Cache em memória por cinco minutos, com no máximo 256 entradas, separado por tenant/consulta/taxonomia e compartilhando chamadas simultâneas. A escolha de idade e os filtros são reavaliados em cada requisição, fora desse cache. Respostas HTTP continuam no-store.

Usa gpt-5.4-mini-2026-03-17, com reasoning_effort none, e a chave existente. Sem dependências, migrations ou nova interface. A chamada envia somente consulta e taxonomia pública; não envia sessão, links ou credenciais ao modelo. Falha da interpretação conserva a busca anterior. Há custo de API e latência nas consultas novas; o cache reduz repetições, sem prometer compreensão perfeita de qualquer texto.

Nomes exatos de destinos públicos e prefixos de menos de três caracteres mantêm o caminho literal existente. Isso evita restringir uma rede a um nicho sugerido pela IA, preserva links sem vetor nas buscas diretas e evita adivinhar intenção a partir de duas letras. Frases e termos gerais continuam no interpretador.

## Deploy

O workflow tem fallback para a origem verificada `https://coolify.temlinkaqui.com`, que respondeu HTTP 200. Uma variável explícita pode sobrescrevê-la. Não é uma secret. Isso remove a ausência da URL mesmo sem acesso administrativo ao GitHub.

A conta do CLI retorna admin:false/push:false e 403 para variables/secrets. A secret COOLIFY_TOKEN é independente; não foi criada nem copiada de credenciais do conector. A confirmação do próximo job e a publicação do SHA testado são registradas nas evidências operacionais em output/.

O CI de 1084fd66 aprovou os 20 grupos de qualidade, inclusive uma rodada integral de 710 unitários e 467 testes de banco. O job de deploy deixou de falhar por URL e passou a informar Missing COOLIFY_TOKEN. A API desse SHA foi publicada e respondeu saudável. A amostra com provedor real identificou ampliação indevida de redes na interpretação; o modelo e as instruções foram refinados antes de concluir os demais serviços. O novo SHA exige novo CI.

O usuário forneceu um token próprio para configuração. Ele foi conferido por leitura autenticada HTTP 200, sem divulgar o valor. As três contas já disponíveis no gh continuam sem administração do repositório. O navegador foi interrompido pelo controle automático de segurança por não conseguir determinar a URL atual. O cadastro da secret continua pendente de acesso administrativo; o token não foi gravado em arquivo ou commit.

## Verificações locais

- Backend: lint, tipos e build aprovados. Rodada ampla com 709 testes aprovados; 35 testes focais aprovados após as últimas assertivas de limite/cache. Não são duas rodadas amplas idênticas.
- PostgreSQL/Redis descartáveis: 464 passaram e três testes de profiles.pg.spec atingiram o limite de 5 segundos enquanto havia outras verificações concorrentes. O arquivo completo foi repetido depois: 20/20 passaram, sem mudar timeout, código de páginas ou assertivas. Os 467 casos foram cobertos por execuções combinadas, não por uma única rodada ampla verde. Os oito casos de busca com SQL real passaram, incluindo o novo cenário semântico.
- Frontend: lint, tipos da aplicação/E2E e build Next de produção pelo setup aprovados. Código de apresentação e dependências não mudaram.
- 26 E2E aprovados em desktop/mobile: frase inédita com categoria dinâmica e rede, semântica específica, maioridade por contexto da IA e regressões anteriores de busca, filtros, foco, teclado, recusa, paginação e mídia. Os testes usam o adaptador real com fetch controlado e SQL real; não são uma avaliação do provedor externo.
- A primeira execução E2E teve erro ENAMETOOLONG na preparação de vetores no Windows: dois casos falharam e 22 não rodaram. O vetor sintético e os comandos foram reduzidos; a repetição passou nos 26 casos. Uma importação de fixture com alias do backend também foi substituída por um vetor neutro, resolvendo o typecheck de E2E sem mudar configuração de tipos.
- Seis testes dos guards de deploy passaram.
- Capturas da busca contextual em 1440 px e 390 px inspecionadas: categoria, rede e link legíveis e sem overflow. Conteúdo/imagens adultos reais não foram abertos.
- Graphify: extração incremental local de dez arquivos, 1585 reutilizados, 8018 nós/28575 relações; sem LLM/API ou clustering. Inclui alterações concorrentes da árvore compartilhada. Não é comprovação de execução.

Após a conferência externa, as duas regressões novas foram reproduzidas em vermelho (rede literal não deve depender de interpretação; prefixo curto não deve disparar o interpretador), depois os 35 testes focais passaram. A amostra final direta com a OpenAI incluiu seis consultas de ofertas, rede por apelido, assunto técnico específico, contexto adulto e trabalho remoto; mais duas frases combinando tema/rede. As classificações finais respeitaram as redes solicitadas, sem inventar destinos. A amostra não prova todas as consultas possíveis. Os logs locais não contêm chaves ou conteúdo adulto real.

Logs em output/search-ai-*.log; cópia isolada em output/age-context-validation-20261025/. A cópia contém o baseline publicado d4fcae38 mais os arquivos desta tarefa, sem o laboratório de produtos/SEO em andamento.

## Referência e reversão

Contrato consultado na [documentação oficial de Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat) e no [modelo GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini). A mudança de modelo vale apenas para interpretar buscas; não houve troca do modelo de moderação ou de sugestões de perfil.

Reversão: reimplantar d4fcae38 nas três aplicações ou reverter o commit desta correção, validando o novo SHA antes de publicar. Não há alteração de banco para reverter. A desativação da interpretação torna a busca anterior a contingência; a origem do painel pode continuar configurada independentemente.
