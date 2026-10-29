# Prévia do convite e métricas anônimas

Pedido: ao compartilhar /ofertas/entrar/natal, mostrar a imagem do grupo; permitir acompanhar acessos e cliques. Preservar redirecionamento padrão e opção de tela, tenant e controles atuais.

- Gerar Open Graph/Twitter no servidor com nome do grupo, canonical, imagem absoluta e noindex. Base: protocolo oficial https://ogp.me/. A foto armazenada vira JPEG 600×600 em rota pública fora de /bff, que robots.txt restringe. GET/HEAD de metadados e imagem não registram visita nem criam grupo.
- Registrar uma visita por carregamento, cliques aceitos no botão e encaminhamentos bem-sucedidos separados por origem automática/manual. Não chamar isso de pessoas únicas nem participantes do WhatsApp. Contagem cumulativa inicia nesta versão, sem inventar histórico anterior.
- Eventos recebem UUID aleatório por documento/interação, só em memória no navegador; deduplicação por tenant/segmentação/evento/tipo. Sem IP, user ID, sessão de visitante, campanha ou referrer nos novos modelos. Preferências DNT/GPC, bots conhecidos, admin e suporte excluídos. Reutiliza política de automação existente; não cria marketing ou cookie analítico.
- Contadores separados de AffiliateSegment para não alterar updatedAt/configuração, invalidar descoberta ou prévias de oferta. Transação idempotente insere evento e incrementa contador; eventos temporários expurgados após 48h no ciclo diário do worker, agregados preservados.
- API pública nunca entrega contadores. Snapshot administrativo autorizado entrega os números da própria segmentação. Três cards na aba Grupos, junto ao convite, com limites semânticos visíveis.
- Falhas de medição não impedem o fluxo do convite. UUID/source opcionais preservam clientes antigos. Não enviar ofertas durante a validação de produção.

Validação: PostgreSQL concorrência, isolamento, bot/admin/DNT/GPC e falha do provedor; frontend StrictMode/retries, metadados e imagem; E2E de compartilhamento sem JavaScript e métricas responsivas; lint/tipos/build e suíte afetada. Publicar pela main somente após CI. Conferir tags e JPEG reais, sem enviar mensagens ou fabricar contagens de visitantes em produção.
