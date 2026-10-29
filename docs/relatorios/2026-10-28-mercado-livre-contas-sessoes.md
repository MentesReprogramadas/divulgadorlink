# Mercado Livre: contas, sessões e geração por URL

Worktree local `C:/VSCODE/temlink-afiliados`, sem commit, push ou deploy. Credenciais e contas da origem VHG preservadas.

## Comportamento

Os detalhes das contas separam OAuth do catálogo e sessão web de afiliados. A configuração própria do catálogo tem prioridade sobre a origem central. Desconectar ou desativar localmente deixa marcador e não retorna à central. O mesmo vale para a sessão de afiliados. A desativação central nesta operação não encerra a conta na origem VHG.

A sessão usa o protocolo já existente no VHG: Cookie e token CSRF de uma requisição autenticada do gerador oficial, mais a etiqueta e o perfil esperados. Os valores secretos são cifrados com contexto por tenant, não retornam no status e não são incluídos na auditoria. O formulário avançado explica a obtenção na própria conta e limpa os segredos ao fechar, salvar ou falhar. Salvar configura a sessão; somente uma resposta autenticada de geração confirma sua validade. Não há login automático, armazenamento de senha ou contorno de CAPTCHA/MFA.

A geração por endereço não depende da busca do catálogo. Requer um anúncio com vendedor identificado e verifica envelope, origem, etiqueta e perfil do link devolvido. Trocar ou desconectar a sessão durante uma geração descarta o resultado. Uma sessão recusada passa a exigir nova configuração. Falha no catálogo preserva os controles independentes da sessão própria.

Preparar oferta por URL preenche somente os links disponíveis; título e preço precisam ser conferidos. Ofertas e histórico anteriores mantêm seus links. Geração não comprova comissão nem elegibilidade de uma venda.

## Evidências

- Backend: lint, typecheck e build aprovados; 55 testes em oito arquivos passaram, incluindo seis PostgreSQL em banco isolado após os locks finais. A primeira suíte completa encontrou o teste de gateway durante a gravação do ajuste (818 aprovados/um erro); o teste e sua regressão OWN foram repetidos com sucesso após congelar o código.
- Frontend: lint, typecheck, build e 875 testes em 222 arquivos aprovados. Detector estático Impeccable verificou 24 arquivos sem achados regex; isso não comprova contraste ou acessibilidade integral.
- Inspeção real desktop/mobile do formulário e geração por URL no painel3016. Um anúncio real gerou `meli.la`; preparar oferta abriu o diálogo na segmentação Natal, com nome vazio para preenchimento. Nenhuma oferta foi salva nem mensagem enviada. A conta central existente foi preservada.
- Alinhamento de campo/botão medido: diferença de base zero no desktop real; E2E da nova tela confirmou menos de dois pixels em desktop/mobile. Capturas em `output/local-affiliates/guided/ml-*` e fixtures em `docs/frontend-profissional/evidencias/afiliados-whatsapp-2026-10-28`.
- Quatro integrações desktop/mobile passaram após atualizar o provider de teste para receber a URL normalizada do anúncio. Oito casos UI foram aprovados; um caso de carregamento inicial precisou de repetição com timeout adequado após a execução concorrente dos checks.

## Limites e reversão

A sessão própria precisa ser fornecida pelo operador e pode expirar. A troca de outra conta real por OAuth exige aplicativo e retorno registrados no ML; não foi feita nesta rodada. Respostas403 e limitações de catálogo continuam sendo reportadas. A geração de link não garante remuneração: produtos e vendas dependem das regras oficiais do programa.

Reverter apenas esta fatia após revisar a árvore suja: domínio/adaptador/use case/rotas do catálogo, `catalog-panel`, `catalog-session-form`, contratos OfferSeed e testes afetados. Esta etapa não introduziu migrations nem dependências.
