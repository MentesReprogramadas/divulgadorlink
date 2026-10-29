# Publicação e configuração de afiliados em produção

Autorização explícita do usuário em29/10: publicar todo o trabalho, reproduzir configuração local de ML/WhatsApp na própria conta de produção, usar o grupo real **TLA | Achadinhos de Natal 🎄🎁 #03** e enviar exatamente um produto de teste após configurar. Não usar o grupo local de testes. Credenciais fornecidas pelo usuário não devem aparecer em código, relatórios, logs ou commits.

- [x] Finalizar rodapé somente com aviso de preço/estoque e preservar título/mensagem exatos da prévia.
- [ ] Preparar gateway permanente HTTPS na VPS, SQLite VHG somente leitura; nenhuma cópia de tokens em texto aberto ou alteração da sessão de origem.
- [ ] Corrigir integração CI dos novos testes, conferir diff/segredos/migrations, executar checks e publicar commit revisável na main pelo fluxo existente de CI/CD.
- [ ] Publicar API/migrations, worker e frontend; conferir saúde e rollback disponível. Configurar chave de cifragem privada consistente em API/worker, ponte e integrações existentes.
- [ ] Recriar instância/segmentação por API ou script com contexto de tenant/conta corretos e cifragem de produção; consultar Evolution e confirmar nome/JID do grupo real. Nenhum outro grupo ativo na segmentação do teste.
- [ ] Gerar produto/preço/link/título reais, conferir snapshot de destino único, aprovar um envio e verificar resultado sem repetir respostas incertas.
- [ ] Verificar painel de produção com a conta do usuário, registrar versão, IDs de implantação e evidências sem segredos; manter local preservado e remover apenas fixtures descartáveis.

Rulings: a autorização de publicação substitui as restrições anteriores de não publicar, sem autorizar alterações em outros produtos. A ponte local loopback não funciona em produção; serviço dedicado somente de leitura é necessário para reproduzir a integração. Credenciais cifradas não podem ser copiadas entre tenant/chaves; recriar com o contexto de produção. A mensagem aprovada distribui para todos os grupos ativos da segmentação; por isso o teste terá um único destino confirmado.
