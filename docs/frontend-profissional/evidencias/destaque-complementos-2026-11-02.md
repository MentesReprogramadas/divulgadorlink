# Revisão dos complementos e restrição +18 — 02/11/2026

Branch: codex/destaque-pos-cadastro. Esta revisão substitui a retenção que selecionava Completo automaticamente.

## Regra aplicada

| Seleção atual | Complemento oferecido |
|---|---|
| Busca | Nicho + Home, completando o pacote |
| Nicho | Busca + Home, completando o pacote |
| Home avulsa | Busca + Nicho, completando o pacote |
| Busca + Nicho | Home |
| Completo | Nenhum |

Para links +18, o servidor remove Home e Completo do catálogo vinculado ao link. Nesse catálogo, Busca pode receber Nicho; Nicho pode receber Busca; Busca + Nicho não recebe complemento. Não renomear Busca + Nicho como Completo.

O helper puro frontend `domain/promotion-upgrade.ts` encontra um pacote permitido que contenha todos os espaços atuais e exibe apenas os ausentes. Preços e acréscimos são derivados do catálogo do servidor, sem novos preços comerciais no navegador. A seleção substitui o pacote em um único pedido; não cria outra cobrança.

Ao completar, o card desaparece. O foco segue para o CTA e o resumo anuncia o novo total. Outros planos permanecem disponíveis na seleção.

## Pós-cadastro e retenção

Ambos começam em Busca + Nicho, com 20% OFF e Home opcional por card inteiro clicável imediatamente antes do CTA.
Selecionar Home muda para Completo e remove o complemento.
Fechar a primeira oferta abre a retenção novamente em Busca + Nicho, mesmo que Home tivesse sido selecionada. A retenção não impõe Completo.
Para +18, nenhuma das duas ofertas apresenta Home ou Completo.

## API: restrição de idade

`assertSurfaceEligibility` centraliza a regra de que qualquer conjunto contendo HOME é proibido para +18.
A guarda roda antes de nova compra, renovação ou retorno idempotente. Também valida as superfícies da cobrança antiga ao reapresentá-la; um pedido Home antigo não pode ser reutilizado depois que o nicho se torna +18.
O endpoint de retomada já revalida a restrição.
Renovação consulta catálogo vinculado ao link com `renewal=1`, filtrando idade sem aplicar desconto de aquisição à renovação.

E2E enviou solicitações reais adulteradas para checkout e renovação, com Home avulsa e pacote Completo: todas retornaram409 e nenhum pedido foi criado para o link +18.

## Verificação desta revisão

- 30 testes frontend passaram: matriz de complementos, seleção de cada plano, nenhuma oferta adicional para Completo, retenção em Busca + Nicho, Home opcional, +18 e fluxo existente.
- 25 testes backend afetados passaram, incluindo13 casos do checkout. Os2 casos novos de renovação/reapresentação de Home para +18 falharam antes da correção e passaram depois.
- Lint e typecheck dos dois pacotes passaram.
- Builds backend e frontend passaram.
- E2E real:8/8 passaram em36,5s, desktop1440×900 e mobile390×844, incluindo API real +18, retenção, card inteiro, teclado, pagamento/ativação, expiração,320px e fonte200%.
- Inspeção manual adicional por PlaywrightMCP verificou Busca→Nicho+Home, Nicho→Busca+Home e Completo sem checkbox em localhost.
- Capturas reais preservadas em `output/promotion-upgrade-validation/{desktop,mobile}`; telas de matriz desktop em `12-matriz-search.png`, `12-matriz-niche.png` e `12-matriz-search_niche_home.png`.
- Site real atualizado mantido em http://tenant-a.localhost:3200 ; harness próprio PID13572. Banco/cache/gateway de teste continuam isolados.
- Nenhum commit, push, deploy ou alteração de dependências.

As limitações de cartão real/3DS, aparelho físico e falhas globais preexistentes descritas no relatório anterior permanecem. A validação desta revisão não comprova aumento de conversão.


## Cores de benefício — ajuste solicitado

Desconto de 20%, economia, contador da oferta, lembrete e complemento usam os tokens verdes `status-success-*`. O card do complemento mantém preço adicional e total explícitos. Alteração restrita a `launch-offer.module.css` e `promotion-checkout.module.css`; sem alteração de regras comerciais.

Verificação: lint, typecheck, 26 testes de componentes, build de produção e 8 E2E desktop/mobile passaram (37,5s). Inspeção real em 1440×900 e 390×844 confirmou texto verde rgb(141, 240, 200) sobre fundo verde rgb(16, 62, 54) no desconto e complemento. Capturas: `output/promotion-upgrade-validation/{desktop,mobile}/13-beneficios-verdes.png`. Permanecem avisos preexistentes de build sobre lockfiles, configuração ESLint e autoprefixer em componentes fora deste escopo. Sem teste de conversão ou pagamento real. Localhost mantido em execução.

Reversão deste ajuste: restaurar as declarações de cor destes dois CSS para a versão anterior, preservando o restante do funil.
