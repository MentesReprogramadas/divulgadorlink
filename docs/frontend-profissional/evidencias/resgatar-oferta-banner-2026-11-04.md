# Resgatar oferta no banner recolhido

Pedido: disponibilizar uma ação destacada abaixo do resumo e cronômetro, sem exigir que a pessoa expanda o banner pelo símbolo de mais.

O banner recolhido agora contém o link primário "Resgatar oferta". No mobile ocupa a largura disponível, com altura mínima de44px. A faixa expandida usa o mesmo rótulo, mantendo somente uma ação de resgate por estado. São preservados destino, plano, duração, prazo absoluto, elegibilidade, dispensa fora do painel e persistência no painel. Não houve alteração de cobrança, backend, migração ou dependência.

Validação local:7testes do componente,1076testes frontend,ESLint,tipo aplicação/E2E e build aprovados. E2E desktop/mobile2/2:ação visível na primeira tela,alvo mínimo44px,href preservado,clique abre o destaque com preço correto e campanha/prazo não reiniciam. Uma tentativa concorrente com build excedeu120s em screenshot desktop; a repetição após o build aprovou2/2 em44,3s,sem mudar timeout ou asserções. Detector Impeccable:nenhum achado.

Antes do ajuste, a inspeção real de produção comAgent Browser cobriu cadastro,oferta inline20%,Home adicionável/removível,Pix/cartão selecionáveis,formulário Stripe na mesma página,declínio sem segundo modal,recuperação com14dias,modal de saída semX/com saída textual e ausência deHome/Completo em link+18. Não foi clicadoComprar nem informado cartão; nenhuma homologação financeira real foi executada. Capturas e detalhes do ambiente ficam emoutput/qa-producao-2026-11-04.

Os resultados finais de CI/deploy e as capturas da nova ação em produção serão registrados no Actions e no fechamento local. As capturas locais não são apresentadas como prova de implantação. Uma janela inicial apresentou carregamento prolongado na recuperação; outra sessão carregou normalmente. Não se alterou código de carregamento sem causa confirmada. A verificação posterior à publicação deve repetir esse caminho. Retirada do cadastro temporário depende do acesso administrativo solicitado; não usar banco de produção nem contornar permissões para limpá-lo.
