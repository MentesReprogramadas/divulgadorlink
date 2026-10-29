# Fotos na navegação e copy das ofertas

Workspace `C:/VSCODE/temlink-afiliados`; alterações anteriores preservadas, sem publicação, commits ou novas dependências.

## Imagens e link externo

Bug reproduzido em contexto isolado, pelo caminho login→Admin→Afiliados→segmentação→Ofertas, sem recarregar o documento. As52 ocorrências de produto no cache local tinham imagem, mas a CSP do documento inicial de login não permitia mlstatic.com. A navegação cliente mantinha essa política: 21 fallbacks de imagem e bloqueios img-src. Abrir diretamente a página de afiliados funcionava e, por isso, as verificações anteriores não cobriam a entrada real.

A política inicial agora permite somente os mesmos hosts HTTPS do CDN do ML na diretiva de imagens em todas as entradas de navegação. Scripts, conexões e demais proteções permanecem com as mesmas origens. Nenhuma chamada de tracking foi adicionada. O link **Ver no Mercado Livre** fica visível fora dos detalhes, mantém anúncio/vendedor original e abre com noopener/noreferrer.

Verificação real repetindo o caminho original: zero bloqueios de imagem, zero fallbacks e primeiras três fotos carregadas.36 testes afetados de middleware/cards/descoberta passaram; lint, tipos e build frontend passaram.14 cenários E2E de afiliados passaram, incluindo regressão de navegação cliente e foto/link em tamanhos desktop/mobile. A entrada dessa regressão usa o menu lateral desktop e depois valida cards nas duas larguras; a navegação completa desde login também foi validada separadamente com conta local real. Uma página já aberta antes da correção precisa recarregar uma vez para trocar a CSP do documento.

## Copy centralizada

A função compartilhada offerMessage gera o texto de prévia/aprovação. Preço único usa **✨ Um achado para você!**, título e **💰 valor**, sem Por:, preço riscado ou desconto inventado. Com preço anterior maior, usa **🔥 Olha esse desconto!**, referência riscada, valor atual e **💸 Economize valor · percentual OFF**. Economia calculada em centavos; percentual arredondado para baixo para não aumentar a redução anunciada. Chamada final: **Confira as opções e aproveite 👇**. A pedido do usuário, o rodapé final é somente **Preço e estoque podem mudar. Confira as condições na loja.**

21 testes de domínio/descoberta passaram, com casos de preço anterior ausente, igual ou menor e economia exata de12,47 para referência59,90/atual47,43 (20% OFF, não21%). Lint, tipos e build backend passaram. A última troca do rótulo para Economize será validada junto da regeneração de títulos.

Histórico e distribuições já aprovadas mantêm o texto congelado. Prévia aberta com versão anterior precisa ser reaberta se a mensagem mudar; não se altera silenciosamente uma aprovação. Nenhuma mensagem de WhatsApp real foi enviada nesta validação.

## Título regenerável e fechamento em 29/10

A prévia indica a origem do título e oferece Refresh. A regeneração preserva preço, foto, link, grupos e expiração; devolve título/mensagem/token assinados juntos. Enviar aprova exatamente essa versão. Falha da IA mantém a prévia anterior e mostra erro; não apresenta fallback como título gerado. Guardas conservadoras impedem títulos só com emojis e alterações em qualificadores restritivos.

Validação consolidada antes da publicação: 912 testes frontend, 872 backend, 16 cenários E2E desktop/mobile, lint/tipos/build dos dois pacotes passaram. Integração PostgreSQL da prévia passou em sete casos, incluindo versão regenerada e replay após envio. Regeneração real retornou HTTP200 com origem OPENAI e a mesma expiração. Os 20 testes finais da ponte permanente e domínio passaram após o rodapé definitivo; 11 testes dos bloqueios de deploy/lease também passaram. Build/lint/tipos backend repetidos com a ponte passaram. Esses resultados não comprovam entrega real ou produção; a publicação e o teste autorizado estão no plano de 29/10.
