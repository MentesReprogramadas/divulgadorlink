# F13 — evidências locais

Doze capturas reais do Playwright em desktop 1280×720, mobile 390×844 e 320px com fonte 200%. Todas inspecionadas: erro recuperável sem perder conteúdo, skeleton/QR com mesma geometria, controles e rodapé completos no tamanho normal; no zoom há rolagem vertical e a ação Baixar permanece alcançável pelo teclado, sem overflow horizontal. Sem máscaras ou retoques. Fixtures determinísticas por cenário; UUID de handle é criado pela aplicação.

79/79 E2E na regressão ampla e 4/4 em repetição final com asserção adicional de alcance por Shift+Tab no zoom. Relatórios sobrepostos, não somar como testes únicos. Sem validação em aparelho físico/produção.

- desktop-qr-320-zoom-actions.png
- desktop-qr-320-zoom.png
- desktop-qr-profile-loading.png
- desktop-qr-profile-offline.png
- desktop-qr-profile-ready.png
- desktop-qr-redirect.png
- mobile-qr-320-zoom-actions.png
- mobile-qr-320-zoom.png
- mobile-qr-profile-loading.png
- mobile-qr-profile-offline.png
- mobile-qr-profile-ready.png
- mobile-qr-redirect.png
