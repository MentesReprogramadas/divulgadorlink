# Recuperação da busca de Natal

Salvar os termos apagava todas as páginas coletadas. Como a coleta percorre uma busca por vez, a primeira página de Natal voltava a mostrar apenas o chaveiro enquanto os demais termos ainda aguardavam. O estado era marcado READY antes de concluir a primeira rodada, e a interface podia parar de acompanhar mesmo quando a coleta progredia.

O diagnóstico real confirmou configuração com cinco termos seguida de outra com apenas Natal. As páginas iniciais retornaram um produto; presentes, árvores e luzes acrescentaram outros nas coletas seguintes. Isso descreve a amostra retornada pelo catálogo, não a quantidade total de produtos natalinos no Mercado Livre.

Agora, a edição preserva páginas válidas por 24 horas, mantendo visíveis somente os termos da configuração ativa. Cache expirado continua sendo removido. A coleta permanece QUEUED até completar as primeiras páginas; a interface renova seu limite de acompanhamento quando checkedAt avança e continua limitada quando não há progresso. Preços, critérios, decisões de envio/descarte, isolamento e permissões permanecem iguais.

Validação: regressões falharam antes da correção; depois passaram 14 testes PostgreSQL em banco próprio, 883 testes backend, 921 testes frontend e 22 E2E de afiliados desktop/mobile. Lint, tipos e builds de ambos os pacotes aprovados. Os testes de infraestrutura Pix foram executados com URLs explícitas de PostgreSQL/Redis isolados. Nenhuma biblioteca ou lockfile foi alterado.

Publicação e configuração real pendentes de CI. Termos solicitados: Natal, Led Natal, Luz Natal, Kit Decoração Natal, Kit Enfeites Natal. Correção de digitação prevista: Luz Nata para Luz Natal. Não executar envio de ofertas nesta validação.

Reversão: reverter o commit desta correção e publicar pelo CI. Não há migration; guardar os termos anteriores antes de alterar a configuração real.

Fechamento: correção publicada junto de 69163c95965d919f7d207d4c5e761432358dc2d4, CI 40902787980 aprovado 25/25. Cinco termos configurados pela API da conta admin correta, incluindo correção Luz Nata para Luz Natal. Coleta final READY com 63 resultados, 20 na primeira página, e cinco páginas iniciais dos termos confirmadas. Cache anterior preservado: após a expansão, a lista retomou 44 antes de crescer a 63. Sessão temporária encerrada (204). Nenhum envio de oferta executado. O catálogo representa a cobertura consultada, sem promessa de desconto em todos os itens.
