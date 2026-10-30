# Convite direto e participação real

Pedido autorizado: reduzir o atraso do convite, configurar eventos Evolution e campanha para medir ingresso real. Preservar orçamento atual e não transformar encaminhamento em ingresso nem inventar consentimento. Não enviar ofertas de teste.

1. Diagnosticar serialização HTML/CSRF/join e substituir o caminho feliz por encaminhamento HTTP sem renderização, com guardas e fallback intactos.
2. Criar receptor Evolution autenticado por instância, estado mínimo com hash, deduplicação, baseline e métricas de entradas/retornos/saídas.
3. Exibir métricas internas no painel, distinguindo eventos de grupo e atribuição publicitária.
4. Validar origem/eligibilidade e acesso de escrita Meta. Configurar somente ações disponíveis e verdadeiras; não trocar objetivo ou orçamento sem evento válido.
5. Executar testes unitários, HTTP/PG, lint, tipos, build, E2E desktop/mobile e inspeção visual. Atualizar grafo incremental.
6. Publicar via CI completo, conferir serviços, medir HTTP em produção e ativar webhook com backup auditado e baseline, sem alterações reais de participantes.

Limites externos já encontrados: CAPI existente não tem leitura de conversões personalizadas (403); criação via UI oferece Site/Loja física, sem chat; Windsor desativou escrita para a conta. O usuário recebeu pedido para habilitar escrita. Não declarar otimização de ingresso concluída sem evento aceito, correspondência/atribuição e elegibilidade.
