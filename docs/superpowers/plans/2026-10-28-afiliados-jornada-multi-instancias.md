# Afiliados: geração automática e jornada com várias conexões

Workspace: `C:/VSCODE/temlink-afiliados`. Extensão autorizada pelo usuário em 28/10/2026. Não criar commits, push ou deploy. Preservar dados do teste local e não importar grupos/instâncias do VHG.

## Escopo e decisões

- Corrigir geração nova ML pela causa observada: o gerador autenticado respondeu sucesso, mas o scraping público posterior recebeu403. Validar o mapeamento inequívoco de origem/anúncio/vendedor para destino/tag/perfil retornado pelo gerador. Respostas ambíguas continuam recusadas. Não reutilizar cache como substituto de geração.
- Separar as áreas administrativas em URLs próprias, reaproveitando navegação e superfícies da visão geral de Minhas páginas. Formulários com nomes claros e estados reais.
- Criar stepper acessível para dados da segmentação, seleção/criação/conexão de contas WhatsApp e revisão. Exigir ao menos uma conexão ativa no servidor. Uma conta pode participar de várias segmentações.
- Guardar imagens normalizadas no PostgreSQL local com autorização administrativa e isolamento por tenant. O provedor recebe bytes base64; nenhuma URL pública de upload é necessária.
- Adicionar associação muitos-para-muitos com backfill das contas existentes, sem apagar dados. Preservar o provisionador usado em criação pendente. Registrar a conta que efetuou cada envio.
- Alternar contas elegíveis e verificar acesso ao grupo antes de enviar. Tentar outra conta somente antes de enviar; resultado incerto exige resolução explícita. Rodízio distribui carga, sem promessa de evitar bloqueios.

## Consumidores afetados

Schema/migration, validação e snapshots administrativos, criação/edição/importação de grupos, convites/expansão/reconciliação, worker/entregas, ponte ML e adaptador, formulário/tipos/navegação/rotas, fixtures e testes unitários/PostgreSQL/E2E, documentação e grafo.

## Execução

- [x] Diagnóstico ML com resposta real e testes da prova origem/destino.
- [x] Migração aditiva e upload administrativo com validação de pixels/bytes e tenant.
- [x] Concluir testes de rotação/failover/concorrência e contratos.
- [x] Concluir interface, stepper, navegação e upload.
- [x] Verificar geração pelo BFF e inspecionar UI desktop/mobile/teclado.
- [x] Executar checks, revisar mudanças, atualizar grafo e registrar limites.

Os testes PostgreSQL usam banco separado `affiliate_ops_regression_20261028`; o worker local usa somente `affiliate_ops`. Os testes de envio usam provedores simulados, sem mensagens em contas reais.
