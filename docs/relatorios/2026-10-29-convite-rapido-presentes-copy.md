# Convite, presentes e mensagens — 29/10/2026

## Alterações

- Convite público recebe os dados na renderização inicial e reaproveita a leitura usada pelos metadados. Elimina uma consulta duplicada no navegador. O bootstrap CSRF permanece único.
- Redis opcional guarda sessão aberta por 5 segundos e convite validado por 30 segundos. Chaves isolam tenant, instância, revisão, servidor e credencial sem expor os valores. Ocupação e autorização continuam ao vivo; criação de grupo exige sessão fresca. Redis indisponível retorna ao provedor.
- Intenção geral de Natal inclui presentes e decoração. Sementes recomendadas: `Presentes de Natal` e `Decoração de Natal`. Plano determinístico abrange roupas, calçados, brinquedos, beleza, casa, eletrônicos e decoração natalina; até 24 termos com complemento da IA. Campanhas específicas preservam seu escopo. A lista continua misturada, deduplicada e paginada.
- Coleta faz uma consulta por execução, com aquecimento a cada 30 segundos enquanto faltam fontes e atualização normal a cada 15 minutos. Não promete pesquisar o catálogo inteiro nem inventar desconto ou histórico. Preço, histórico e reputação mantêm as regras existentes.
- A IA recebe foto oficial do CDN do Mercado Livre e título original. Gera chamada natural e identificação objetiva em linhas separadas. Medidas e fatos precisam constar do título; a foto não prova características. Sem urgência, escassez ou superlativos inventados.
- Prévia e regeneração incluem a chamada no token assinado. Envio valida e persiste a mensagem exata aprovada. Nada é enviado automaticamente por esta mudança.

## Evidências anteriores à publicação

- Backend: 903 testes aprovados, um teste Redis dedicado omitido nessa execução e executado separadamente. Redis real + unidade: 6 aprovados. PostgreSQL próprio: 65 aprovados, incluindo imagens. Teste de copy adicional: 11 aprovados. Lint e build aprovados; tipos repetidos após corrigir fixture com catalogId inválido.
- Frontend: suíte completa anterior 932 aprovados; testes afetados finais 18 aprovados; 24 E2E em desktop/mobile aprovados. SEO: 22 E2E aprovados; regeneração com nova chamada: mais 2 E2E aprovados. Lint, tipos e build dos dois pacotes aprovados.
- OpenAI real: três produtos existentes com foto; três respostas OPENAI aceitas, 1,47–2,75 segundos. Exemplo: “Uma cascata de LED amarelo para sua decoração de Natal ✨”. Nenhuma mensagem enviada; credenciais permaneceram no container da API.
- Benchmark anterior: navegação direta ao convite em três contextos móveis novos, com destino WhatsApp interceptado: 3445 / 3212 / 3236 ms (mediana 3236 ms). Cabeçalho e user agent de diagnóstico excluem métricas. Isso mede o encaminhamento no navegador, não o lançamento nativo no celular.
- Revisão independente estática não encontrou novos bloqueios após exigir sessão fresca para expansão e remover preload concorrente de CSRF.

## Pesquisa do funil

[Relatos de anunciantes](https://www.reddit.com/r/whatsapp/comments/1oi375y/whatsapp_group_link_not_working/) descrevem convites abrindo loja de aplicativos apesar de WhatsApp instalado. São relatos, não prova da causa das 43 visitas. [Chrome documenta](https://developer.chrome.com/docs/android/intents) restrições a abrir aplicativos via intent sem gesto do usuário; o documento não comprova falha específica do nosso link HTTPS. [Branch documenta](https://help.branch.io/developer-hub/ios-universal-links) limitações de Universal Links em navegadores embutidos no iOS.

Grupo real consultado por inviteInfo: nome correto, 4 membros, aprovação de novos membros desligada. Não foi constatado bloqueio por aprovação. Meta informa 43 visualizações da página e 99 cliques de saída no recorte disponível, com otimização para LANDING_PAGE_VIEWS, não ingresso confirmado. As 43 visualizações antecedem o retorno do convite ao modo REDIRECT às 19:03 BRT. Contadores de ferramentas diferentes não representam necessariamente pessoas únicas nem a mesma etapa. Dados e limites em `2026-10-29-meta-natal-funil.md`.

O post orgânico do Instagram não contém o CTA do anúncio. Prévia compartilhada da Meta exigiu login; Biblioteca de Anúncios retornou 403 no navegador isolado. Não há URL nativa com CTA verificada, nem confirmação em aparelho físico. Nenhum anúncio, orçamento ou campanha foi alterado.

## Limites e reversão

Convite revogado externamente pode permanecer em cache por até 30 segundos. A consulta de ocupação continua dependendo do WhatsApp, por isso não existe garantia de latência instantânea. O navegador embutido e a decisão de abrir o aplicativo pertencem ao dispositivo. A descoberta amplia a amostra, não garante estoque, comissão ou desconto para qualquer produto.

Reverter código pelo CI para 3e26eb8e e restaurar sementes anteriores por operação auditada, preservando métricas, ofertas e histórico. Não há migração de schema. Chaves de cache expiram sozinhas.

## Correção da fixture no CI

O CI inicial a16dde7e bloqueou a publicação porque uma comparação literal do E2E ainda esperava a prévia sem headline. A fixture havia sido ampliada depois da primeira execução completa. A expectativa foi atualizada para conferir as duas linhas integralmente, sem remover a assertiva. Reexecução local completa final: 24/24 E2E desktop/mobile aprovados em 2,6 minutos. Nenhum código de produto mudou nessa correção.
