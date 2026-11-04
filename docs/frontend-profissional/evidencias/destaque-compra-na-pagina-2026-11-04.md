# Destaque na própria página — evidências de 04/11/2026

Implementação da spec aprovada em `codex/destaque-pos-cadastro`, no worktree `.worktrees/destaque-pos-cadastro`. Plano executado com subagentes de backend, compra, superfícies e revisão independente. Sem commit, push ou deploy; nenhuma dependência nova.

## Resultado

- Cadastro bem-sucedido substitui formulário e stepper pela oferta de 20%, sem modal. Prazo abaixo do header, desconto verde e Comprar na própria página.
- Home opcional, clicável pelo card e removível; Completo direto sem complemento. Links +18 não recebem Home/Completo na interface nem na API.
- Pix cria/retoma cobrança na mesma superfície. Cartão usa Elements na mesma página, preservando autenticação necessária do provedor.
- Dispensar a oferta inicial vai ao painel, sem segundo modal. Recuperação mantém seleção e prazo absoluto, pode ser ocultada fora do painel e permanece no painel até perder validade.
- Modal de saída apenas na escolha manual de destaque, preservando pacote/duração, sem desconto cumulativo, loop ou checkout intermediário.
- Botão Destacar abaixo das métricas; demais ações expostas. Criar com ajuda aparece primeiro em Minha página.
- Servidor preserva autorização, tenant, idade, idempotência, confirmação, elegibilidade e expiração. Compra confirmada aplica os espaços elegíveis ao link.

## Verificações executadas

- Frontend: lint, typecheck, 95 testes afetados em 11 arquivos e build de produção aprovados.
- Backend: lint, typecheck, 37 testes afetados únicos e build aprovados. Migração aditiva de seleção da campanha aplicada ao banco local dedicado; Prisma Client regenerado.
- Playwright Test: **12/12 aprovados (3,9 minutos)**, seis jornadas em desktop 1440×900 e mobile 390×844. Inclui cadastro, Home reversível, Pix, webhook assinado, recuperação, saída contextual, Voltar sem retenção, +18 e adulteração de API, tenant, expiração em 320px/200% de fonte e ordem da criação de página.
- Axe sem violações nos escopos da oferta e do diálogo testados. Teclado, foco contido no diálogo, checkbox pelo teclado e CTA dentro do viewport verificados. Não representa auditoria integral do site.
- Agent Browser: sessão isolada `destaque-v2-ad94c5ebc770`, navegação real no localhost, cadastro desktop/mobile, seleção/remoção da Home, pagamento Pix confirmado no ambiente local, recuperação do pacote Completo/14 dias e modal de saída em ambos os tamanhos. Consulta de erros do navegador retornou vazia antes da compra final do modal.
- Grafo atualizado incrementalmente em modo code-only local: 9182 nós / 33103 relações, sem LLM/API externa. Relatórios gerados do Playwright excluídos do índice.

## Capturas

Diretório `output/destaque-v2-implementacao/`: pastas `desktop` e `mobile` contêm as 13 capturas por dispositivo da última execução E2E aprovada. Pasta `agent-browser` contém capturas reais adicionais; usar `08-mobile-oferta-final.png`, `12-desktop-painel-final.png`, `13-desktop-modal-saida-final.png`, `14-mobile-modal-saida-final.png` e `06-mobile-pagamento-confirmado.png`. O arquivo `10-mobile-painel-carregando.png` é intermediário, não evidência do resultado final.

## Como testar

Abrir `http://tenant-a.localhost:3200`. O harness dedicado usa frontend 3200, API 3533, stub 4299, PostgreSQL 5633 e Redis 6580. Está em modo desenvolvimento para continuar a inspeção; o build normal de produção foi verificado separadamente.

1. Criar uma conta de teste ou entrar com `teste-v2-mobile@tenant-a.test`, senha local `Senha-e2e-1`.
2. Em Meus links, cadastrar um link elegível. A oferta substitui o formulário. Selecionar/remover Home e Comprar com Pix; não enviar dinheiro real ao ambiente local.
3. Para uma oferta existente, usar Recuperar oferta abaixo do header; expandir/recolher e conferir pacote/duração. A conta mobile já possui essa campanha.
4. Em Destacar este link, escolher um pacote e tentar sair. Quando ainda não mostrado na sessão/campanha e sem pagamento pendente, o modal oferece a compra ali mesmo. A oferta inicial não dispara esse modal ao ser dispensada.
5. O fluxo automatizado testa também expiração e +18, sem exigir esperar 24 horas ou adulterar dados manualmente.

## Limites e reversão

Pix usa gateway local simulado e webhook assinado, sem movimentação financeira real. Não há chaves Stripe no harness: Cartão fica indisponível nele; lógica de Elements e sincronização de valores tem cobertura unitária, mas cartão/3DS real não foi validado. A suite completa histórica do projeto não foi reexecutada; os totais acima são dos testes afetados e da jornada alterada.

Build ainda apresenta avisos existentes de lockfiles/raiz, plugin ESLint Next e autoprefixer em componentes fora deste escopo. Não há evidência de aumento de conversão ou validação de produção.

Mudanças permanecem isoladas e sem commit no worktree. Para reverter, revisar e descartar somente o diff deste lote, preservando trabalho anterior; a migração aditiva contém dados de seleção e exige avaliação antes de remoção em banco com dados reais. O harness e os containers são dedicados; nenhum processo alheio foi encerrado.
