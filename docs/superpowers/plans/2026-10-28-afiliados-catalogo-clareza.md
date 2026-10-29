# Catálogo útil e tela de ofertas simples

Pedido: paginação responsiva, investigar poucos produtos/descartes incorretos e reduzir poluição com cards liquidglass. Preservar lista combinada, tenant/CSRF, dinheiro verificável, prévia e confirmação explícita. Workspace existente; sem commits, branches, dependências ou publicação.

- [x] Reproduzir e medir GET de paginação e carregamento de conexão; investigar respostas reais do catálogo sem segredos.
- [x] Corrigir classificação de consulta sem anúncios/falha vs descarte real; preço anterior inválido não elimina preço atual válido; disponibilizar todos os produtos válidos por padrão.
- [x] Tela em Produtos, Descartados e Configurações; cards coesos, ação principal de prévia, diagnóstico e opções técnicas separados. Produtos já coletados aparecem sem esperar conexão remota.
- [x] Checks afetados, builds, testes e inspeção real desktop/mobile/teclado; revisão independente e grafo atualizado.

Evidências e limites: [relatório](../../relatorios/2026-10-28-afiliados-catalogo-clareza.md).

Superpowers systematic-debugging e subagent-driven-development aplicados, com implementadores isolados de UI e adapter/domínio; coordenação da integração/medição na raiz. Taste/Impeccable/Emil/temlink-components preservam identidade Ondas e componentes existentes. Autorizações anteriores dispensam pausas genéricas de desenho; segurança e confirmações de envio permanecem.
