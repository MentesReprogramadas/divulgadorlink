# Destaque pós-cadastro — E2E real

Execução local em 02/11/2026, branch `codex/destaque-pos-cadastro`, worktree `.worktrees/destaque-pos-cadastro`.

## Ambiente

- Next em produção, compilado pelo harness existente: `http://tenant-a.localhost:3200`.
- API real em 3533; PostgreSQL próprio em 5633; Redis próprio em 6580.
- Gateway Woovi, mensagens e validações externas atendidos pelos stubs existentes do harness em 4299. Nenhuma cobrança real ou serviço de produção foi usado.
- Containers exclusivos `divulgador-e2e-pg-destaque-funil` e `divulgador-e2e-redis-destaque-funil`; não foram encerrados processos alheios.
- Migração `20261102170000_promotion_launch_offer` aplicada junto das demais migrações em banco novo.
- Usuários de teste verificados próprios, criados no banco isolado. Cada teste guarda o limiar anterior em `beforeEach`, usa aprovação zero na sua jornada e restaura o valor em `afterEach`, evitando contaminar outras jornadas da CI.
- Não foram usados mocks de APIs do aplicativo nos testes. URLs `*.localhost` são chamadas no Chromium, pois o cliente Node de HTTP não as resolve neste Windows.

## Comandos

Primeira criação do ambiente:

```powershell
$env:E2E_PORT_OFFSET='200'
$env:E2E_RUN_ID='destaque-funil'
$env:E2E_KEEP_SERVER='1'
npx playwright test --config playwright.launch-offer.config.ts
```

Repetição, preservando banco e serviços próprios já iniciados:

```powershell
$env:E2E_REUSE_SERVER='1'
npx playwright test --config playwright.launch-offer.config.ts
```

O modo `KEEP_SERVER` existe somente na configuração focada para permitir inspeção e capturas após a suíte. O teardown habitual permanece padrão quando essa variável não é usada. Não usar `REUSE_SERVER` contra outros ambientes.

## Resultado

**8 testes passaram em 36,3 segundos na execução final**, quatro jornadas em cada viewport: desktop 1440×900 e mobile 390×844. A execução final inclui o checkout compacto e o código de retomada de cobrança. Typecheck do E2E (`npx tsc --noEmit -p e2e/tsconfig.json`) também passou. O limiar do tenant foi conferido em0,85 após o término, comprovando a restauração dos hooks.

Após a suíte, `npm run build` normal do frontend também passou (79 páginas estáticas geradas). Ele regenerou `next-env.d.ts` para `.next/types/routes.d.ts`, enquanto o servidor de inspeção permaneceu ativo usando `.next-e2e`.

| Jornada | Resultado observado |
| --- | --- |
| Cadastro do link e oferta | POST real cria link; oferta mostra20% e R$14,32; publicação confirmada com limiar0. |
| Upgrade Home | Clique no texto do card seleciona checkbox; Space alterna; valor total vira R$26,32. Label está imediatamente antes do CTA no DOM e acima dele em geometria. |
| Pagamento e ativação | Pix real do gateway de teste cria um pedido de2632centavos; webhook RSA confirma pagamento e ativa3superfícies. Replay mantém3registros, sem duplicação. |
| Retenção e recuperação | Recusa mostra Completo pelo mesmo preço; oferta conserva ID/prazo; lembrete persiste e fechamento permanece após reload. |
| CTA de Meus links | Altura medida de pelo menos52px após correção do seletor global que a reduzia a44px. |
| Expiração | Prazo persistido vencido retorna oferta nula e remove20%; checkout comum permanece disponível; sem overflow em320px e fonte a200%. |
| Idade e isolamento | Home ausente no catálogo e UI para nicho restrito; outro tenant recebe404 sem nome do link. |
| Semântica e teclado | Axe no resumo do destaque sem violações nos dois viewports; checkbox operável porSpace com foco real. |

Capturas preservadas em `output/promotion-launch-offer-validation/desktop` e `output/promotion-launch-offer-validation/mobile`: oferta, checkout comHome, revisão, Pix, confirmação, Meuslinks, retenção, lembrete,320px e fonte200%. Diálogos usam a viewport real; demais estados usam fullpage após retornar ao topo e esperar um frame. Não há máscaras nem remoção de foco para esconder diferenças.

## Limites

- Esta execução usa Chromium emulado, não aparelho físico.
- Axe cobre o resumo da compra; não prova acessibilidade integral do site. A revisão visual das capturas é complementar.
- Cartão real/3DS não foi exercitado pelo gateway de teste. Regressões de retomada do cartão são verificadas separadamente em testes de componente/backend.
- Não há comprovação de aumento de conversão nem teste em produção.
- O build emitiu avisos preexistentes de CSS `start/end`, raiz inferida com vários lockfiles e Next `standalone`; concluiu com sucesso.
- A primeira tentativa teve falhas do próprio teste por DNS do HTTP Node e nomes repetidos de fixtures no reuso; foram corrigidas. A execução final completa passou.

Este relatório descreve a execução acima. Se o checkout for alterado depois, repetir a suíte focada e atualizar as evidências finais.
