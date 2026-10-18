
# Pendências de validação do roadmap

## REG-F03-001 — canonicalUrl repetida após retirada entre páginas

Descoberta durante F31, em 18/10/2026. Teste F03-I01/PG01/T01 em related-links.pg.spec.ts falha quando o representante deduplicado da URL aparece na primeira página e sai do ar antes da próxima: outra linha da URL pode ocupar uma posição posterior, pois o embaralhamento/cursor usa ID. 254/255 PG aprovados; não apagar ou relaxar o caso.

Reprodução determinística em output/roadmap-f31/related-repro2.log, banco novo local f31_related_repro2/5742. Fixture tenant 32329779-dfe2-4ec0-96f4-35b5a6470338, seed zero. Repositório/domínio/filtro F03 envolvidos iguais ao HEAD (related-unchanged.json). Código de produto F03 não foi alterado nesta entrega.

Escolha: manter a falha visível no gate global S7 e continuar a sequência independente autorizada. Alternativas avaliadas: aceitar outro rerun aleatório (rejeitada: esconde o defeito); trocar deduplicação para ocultar todos os duplicados quando um estiver indisponível (rejeitada: muda elegibilidade); estabilizar posição por identidade canônica com cursor versionado (candidato a correção específica, exige teste de remoção/alteração e compatibilidade de cursores). A F31 tem nove PG próprios verdes; CI e liberação seguem pendentes. Nenhuma alteração silenciosa na regra de recomendações.
