# Busca interpretada por IA e URL do deploy

> Execução: skill executing-plans, sem delegação. Pedido já autoriza corrigir a busca e publicar na main.

## Resultado e desenho

Interpretar consultas em linguagem natural usando a OpenAI já configurada. A IA recebe apenas a consulta e a taxonomia pública do tenant; devolve termos de busca, nichos e redes existentes. Não recebe links, credenciais ou dados de sessão. Nenhuma lista de exemplos determina a interpretação principal. As regras atuais de publicação, idade, tenant, descoberta, relevância e patrocínio continuam no servidor.

Reutilizar a composição da busca, SQL parametrizado e UI atual. Resposta estruturada validada, timeout, limite de entrada/saída, cache curto e limitado por taxonomia/tenant/consulta, compartilhando chamadas simultâneas. Falha da interpretação mantém a busca existente; não inventar resultados. Não instalar dependências ou criar migrations.

Configurar no workflow a origem HTTPS verificada do Coolify como fallback de vars.COOLIFY_URL. Isso resolve a URL mesmo sem permissão administrativa nesta sessão. A secret COOLIFY_TOKEN é independente e não pode ser substituída por credenciais do conector. Documentar se a ativação automática continuar bloqueada por acesso.

## Etapas

- [x] Criar testes vermelhos para interpretação dinâmica, frases não enumeradas, combinação tema/rede, idade, isolamento e falha do provedor.
- [x] Implementar contrato/adaptador OpenAI, composição e consumo nas duas rotas, com cache e validação de facetas públicas.
- [x] Atualizar fixtures OpenAI/E2E para atravessar o contrato HTTP do adaptador com fetch controlado e conferir cenários em desktop/mobile, usando SQL real.
- [x] Configurar a URL e testar os guards do deploy; documentar a limitação da secret administrativa.
- [x] Executar lint, tipos, testes afetados e amplos, PG/Redis, build e E2E em cópia isolada do SHA da main, preservando trabalhos concorrentes. Rodadas e limites no relatório.
- [x] Atualizar Graphify incrementalmente e revisar o diff.
- [ ] Publicar somente os arquivos desta mudança e aguardar CI antes do deploy.
- [ ] Conferir os três serviços e uma busca contextual em produção; registrar evidências sem conteúdo adulto ou segredos.

Referência técnica: documentação oficial OpenAI Structured Outputs (Chat Completions) e GPT-5.4 mini, consultada em 26/10/2026. A interpretação final usa o snapshot gpt-5.4-mini-2026-03-17, verificado com a chave existente; não há migração de modelo de moderação/perfil.

Decisão: manter a busca anterior apenas como contingência quando a interpretação falha. A IA é o caminho principal; o modo semântico exige relevância mesmo dentro de uma faceta. A cópia isolada da entrega anterior representa d4fcae38 e recebeu somente os arquivos desta tarefa; alterações concorrentes do laboratório de produtos/SEO ficaram fora da validação e da publicação.

Decisão após teste externo: instruir extração estrita de redes e objetivo principal, usar modelo mais aderente e cinco segundos de timeout. Preservar destino literal exato e prefixos curtos antes de interpretar; dois testes vermelhos confirmaram essas regressões. O CI de 1084fd66 aprovou 20 grupos; a API inicial está saudável, mas o refinamento será publicado somente após o CI do próximo SHA. A secret segue pendente de administração do GitHub; controle de navegador indisponível por bloqueio de URL.
