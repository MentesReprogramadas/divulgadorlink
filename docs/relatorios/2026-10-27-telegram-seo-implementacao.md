# Telegram: implementação para busca orgânica

Pedido: melhorar Telegram com o inventário existente, priorizando adulto +18, apostas e ofertas, validar e publicar. Autorização explícita para publicação no pedido de 27/10/2026.

## Escopo e decisões

- Base isolada: `20e776ec`, preservando o checkout compartilhado e suas alterações.
- Reutilizar a API, o editor de coleções, a elegibilidade e o CSS existentes. Nenhuma dependência ou migração nova.
- Na página geral de cada rede, mostrar somente coleções públicas elegíveis daquela rede. Prioridade: adulto, apostas, ofertas. Na home, manter a retirada das coleções solicitada pelo usuário.
- Em Telegram, acrescentar orientação original sobre grupos, canais, convites, ofertas e acesso adulto. Preservar indexação/canonical existentes e não repetir esse texto em filtros ou páginas de paginação.
- O inventário público confirmado do Telegram tem quatro anúncios após confirmação de idade, sem próxima página: adulto, ofertas, divulgação e renda extra. Não há grupo de apostas nessa rede. Usar as plataformas existentes numa seção claramente chamada “Sites de apostas no catálogo”, sem alterar rede ou nicho dos anúncios.
- Publicar a seleção de ofertas com o anúncio `cmveg54nr0069lj01kmgd44xe`. Preservar a coleção adulta e sua prévia autorizada `cmuvnc3hk000knv01b0r65eed`; preservar a coleção de sites de apostas.
- O editor exige ADMIN real. Após o usuário entrar novamente, a coleção `/descobrir/ofertas-telegram` foi salva e publicada, com `index,follow`, canonical próprio e presença no sitemap confirmados por HTTP. A página geral recebeu o título `Grupos de Telegram: links e canais por assunto` e descrição editorial aprovada. As coleções adulta e de apostas foram conferidas, preservando suas seleções e classificações.

## Validação executada antes da publicação do código

- Frontend: lint, typecheck, 809 testes unitários e sete testes focados de coleções aprovados. Build de produção compilado e servido pelo setup E2E.
- Backend: lint, typecheck, build e 18 testes afetados de SEO/admin aprovados.
- E2E SEO: 18/18 aprovados em desktop e celular. Cobre seleção por rede, ordem, navegação por teclado, canonical/robots e ausência de conteúdo adulto restrito no HTML público. Capturas de ambas as larguras inspecionadas. A interação nova aguarda o carregamento inicial antes de recusar idade e testa foco/Enter; não reduz a barreira de idade.
- Detector Impeccable: lista vazia de achados nos componentes alterados. Reutilizados tokens e estilos existentes, sem novas animações.
- Revisão independente somente leitura: sem bloqueadores; API deve publicar antes do frontend porque acrescenta os campos usados para filtrar as coleções.
- Produção editorial: ofertas HTTP 200/index/canonical próprio e sitemap com nova URL; Telegram HTTP 200 com novo título; adulto permanece HTTP 200/index/canonical próprio. A publicação do código e sua inspeção final ainda serão conferidas após o CI.

Não foram medidos ganhos de tráfego, volume de busca ou posição. Não houve solicitação repetida de indexação.

## Conferência editorial e CI

- Coleção de ofertas: título final `Ofertas e cupons no Telegram`, rede Telegram, nicho Compras/Ofertas/Cupons, seleção explícita do anúncio existente. Publicação conferida no navegador em desktop e 390 px, sem rolagem horizontal, e no sitemap.
- Adulto: coleção aprovada com somente o anúncio autorizado `cmuvnc3hk000knv01b0r65eed`, mantendo classificação explícita e prévia segura. Apostas: três sites selecionados, rede Site/nicho Apostas; nenhuma publicação recategorizada como Telegram.
- CI `40563304119`, código `6e547cfb`: 21 checks aprovados, incluindo backend (736 testes + 470 PostgreSQL), frontend (809 testes), imagens, SEO desktop/mobile e validação visual desktop/mobile. O único job sem execução de testes, `features-mobile 2/4`, falhou em `npm ci` durante o download de `@prisma/engines`, com `ECONNRESET`.
- O deploy automático permaneceu bloqueado. A reexecução de workflows não está disponível nas contas GitHub conectadas; este registro dispara outra execução pelo push normal já autorizado, sem remover checks ou modificar permissões, dependências e proteções do deploy.

## Reversão

Reverter o commit de código desta entrega para retirar as seções, sem remover dados. No editor, desmarcar aprovação da nova coleção retira sua elegibilidade e sua presença no sitemap. Desmarcar aprovação do editorial da rede Telegram restaura o título/descrição de fallback anteriores. Preservar os demais editoriais.
