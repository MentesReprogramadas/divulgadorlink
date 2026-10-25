# Divulgar compacto e rodapé — 24/10/2026

Pedido: leitura objetiva no mobile, ação na primeira tela e identidade oficial no rodapé.

- AdvertiseLanding continua Server Component e mantém CTA recebido do servidor, permissões, destino e atribuição de campanha.
- Removidos preview fictício e seção longa. Título, texto curto, ação, análise/destaque pago e três passos compactos.
- Rodapé compartilhado usa horizontal-escuro.svg do kit aprovado Confluência sobre navy, com link acessível para o catálogo. Termos, privacidade e cookies preservados; páginas pessoais continuam com seu próprio shell.
- Browser real Chromium: 320x568,390x844,1440x900; capturas efetivamente abertas, sem overflow. CTA termina em313px nos dois mobiles e431px no desktop. Em320x568 ficou inteiro acima do banner de consentimento. Clique levou a /cadastro. Logo carregada e href / confirmados. Rodapé sem banner também aberto.
- Lint, tipos app/E2E e build aprovados;4 arquivos/14 testes focais aprovados. Logs output/divulgar-{lint,types,build,footer-tests}.log. Não houve execução da suíte completa E2E com containers; interação foi conferida pelo Playwright MCP isolado.
- O ambiente já emitia erros CSP de websocket de desenvolvimento/instrumentação antes da edição; a política não foi ampliada para contorná-los. Sem garantia medida de aumento de conversão; sem certificação em dispositivo físico ou Safari/Firefox.
- Graphify incremental local sem LLM/API:7741nós/27729relações; CSS/pixels confirmados separadamente. Reversão por trechos dos quatro arquivos alterados, preservando árvore anterior. Sem dependências, commits ou deploy.

Ajuste posterior solicitado: rodapé usa somente simbolo-escuro.svg (32px, alvo44px), à esquerda e ao lado dos textos no mobile. Conferidas e abertas capturas320/390/1440; sem overflow. Em320px os links quebram em duas linhas ao lado do símbolo, preservando legibilidade.
