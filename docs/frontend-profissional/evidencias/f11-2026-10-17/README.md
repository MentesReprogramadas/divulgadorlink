# F11 — assinaturas de páginas

Evidência local em Chromium desktop 1280×720 e mobile 390×844; administração também em 320 px/200%. As imagens usam provedor, preços e recursos **de teste**, sem oferta pública ou cobrança real. As datas vêm do relógio da execução e não constituem baseline de comparação pixel a pixel.

Padrões revisados: ações à direita fora dos cards; um título de rota; comparação em três colunas no desktop/uma no mobile; configuração administrativa em duas colunas/uma no mobile; formulários somente em modal, com etapas para preço/recursos. Estados de confirmação, pagamento pendente, cancelamento de renovação e falha distinguem cobertura de pagamento e preservam conteúdo.

O refresh usa o renderer real com os mesmos cards/textos/alturas; teste E02 mede diferença inferior a 1 px. Skeletons iniciais usam a composição da rota, sem renderizar a visão geral. Axe A/AA, teclado na confirmação, foco/modal e ausência de overflow em 320 px/200% foram verificados na jornada aplicável. Não significa acessibilidade total ou validação em aparelho físico.

Capturas `desktop-*` e `mobile-*`: comparação de planos, confirmação da troca, renovação cancelada, provedor em falha, renovação não paga, administração, administração em refresh e administração com zoom. Modais usam captura do viewport; página inteira é registrada depois de normalizar o scroll. Isso evita artefatos de composição do Chromium com backdrop e elementos fixos, sem esconder elementos via CSS/máscara.

Resultados funcionais: 69 cenários de regressão ampliada e dez específicos da F11, registrados separadamente; não somar como casos únicos. A revisão das capturas geradas motivou duas baterias adicionais de quatro casos, somente para corrigir o modo de captura. Sem retry/skip nas execuções aceitas. [Decisões, critérios, testes, migração e reversão](../../../planejamento-features/execucao-f11.md).
