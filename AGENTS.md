# Tem Link Aqui

## Escopo e fonte de verdade

O programa de frontend inclui engenharia, produto, UX, acessibilidade e Design System. O contrato está em [docs/frontend-profissional/README.md](docs/frontend-profissional/README.md).
Código, testes e histórico estabelecem o comportamento observado; documentação descreve intenção e pode estar desatualizada. Registrar divergências, sem escolher silenciosamente uma nova regra comercial.
Ler o estado do Git e instruções locais antes de editar. Preservar alterações existentes. Não criar branches, commits, push ou deploy sem pedido.

## Limites de execução

Em 15/10/2026 o usuário autorizou implementar o piloto e percorrer todas as telas, ajustando-as sem novas pausas de aprovação. Executar em lotes: validar /divulgar, consolidar padrões e avançar pelas jornadas com testes e inspeção real. A autorização não dispensa validação nem permite mudar regras comerciais por consequência do redesenho.
Não instalar bibliotecas de UI, trocar frameworks, alterar cobrança, moderação, quotas, permissões ou rastreamento como efeito lateral de uma melhoria visual.
Não preservar escolhas visuais ruins por inércia: avaliar hierarquia, contraste, densidade, tipografia e composição, justificar a proposta e validá-la no navegador.

## Regras de produto

- / é catálogo; /divulgar é aquisição de quem publica. Preservar os objetivos distintos.
- Publicar é grátis; destaque é pago e depende de elegibilidade confirmada pelo backend. Não prometer audiência ou resultados garantidos.
- Preservar cabeçalho compartilhado, logo para /, restrições de conteúdo da landing, URLs e contratos testados. O plano de 2026-10-09 sobre isolar o cabeçalho foi superado pelo commit 691c627.
- Não tratar a promessa atual de análise humana como descrição comprovada do backend: existe aprovação automática condicional. Reconciliar essa divergência antes de alterar a promessa ou o fluxo.
- Preservar verificação, canSubmit, suspensão, autorização no servidor e isolamento de tenant. Estado visual e cookies de papel não concedem permissão.
- Preservar condições comerciais de destaque, restrição de idade, superfícies, combinações, idempotência, confirmação e expiração de pagamento. Não duplicar preços ou elegibilidade na apresentação.
- Preservar marcação de patrocinado, surfaceToken, caminhos de saída, eventos e semântica de impressões/cliques.
- Preservar consentimento, atribuição de primeiro toque, ausência de marketing antes do aceite e proteção de dados pessoais em analytics.
- Preservar canonical, robots, sitemap, metadados e renderização pública no servidor.

## Engenharia

Consultar [arquitetura.md](docs/frontend-profissional/arquitetura.md). app compõe rotas; components/ui contém primitivas; components/layout contém estrutura; features compõe funcionalidades; domain mantém regras puras; lib mantém infraestrutura. Introduzir essa organização somente nas áreas migradas.
Server Components por padrão; limitar cliente à interação. Componentes de apresentação não acessam transporte, sessão, preços nem autorização diretamente.
Reutilizar contratos e componentes antes de criar abstrações. Preferir composição e variantes tipadas; não criar componentes universais, booleanos contraditórios, any ou camadas sem responsabilidade concreta.
Usar nomes de arquivo kebab-case, componentes PascalCase, hooks useNome e tipos NomeProps. Manter convenções locais durante uma extração, sem formatação ampla.
Usar npm em cada pacote conforme CI e package-lock.json. Não modificar lockfiles ou dependências em uma mudança apenas visual.
CSS Modules para componentes novos/migrados; tokens e fundamentos globais permanecem compartilhados. Não transformar globals.css de uma vez nem aumentar especificidade para corrigir vazamentos.

## Design e ferramentas

Consultar [design-system.md](docs/frontend-profissional/design-system.md) e [ferramentas.md](docs/frontend-profissional/ferramentas.md). Tokens propostos só viram contrato após validação do piloto.
Usar pesquisa de referências reais e Refero Design quando disponível; esta é a metodologia principal. Fontes de sistemas profissionais complementam a pesquisa. Registrar o que cada referência fundamenta, sem copiar layouts ou importar outra identidade.
Context7 serve para documentação técnica, respeitando Next 15/React 19; se faltar a versão exata, consultar documentação oficial versionada e explicitar a diferença.
shadcn MCP serve para consultar padrões. Não executar shadcn init/add nem aplicar componentes externos automaticamente. Skills shadcn e migrate-radix-to-base não autorizam adotar essas bibliotecas.
21st MCP é opcional e depende de credencial. Código gerado é insumo: revisar dependências, licença, acessibilidade, CSS e fronteiras antes de integrar. Não enviar segredos ou dados de usuários.
Chrome DevTools serve para diagnóstico real; Playwright Test é o executor de regressão. Não confundir MCP, biblioteca, ferramenta e Skill.
As cinco Skills temlink-* dividem os fluxos de trabalho; este AGENTS é a fonte das proteções comuns. Não duplicar regras em todas as Skills.

## Qualidade e fechamento

Consultar [piloto-e-qualidade.md](docs/frontend-profissional/piloto-e-qualidade.md). Não aceitar apenas teste escrito ou captura gerada como validação concluída.
Verificar comportamento e capturas em desktop/mobile, teclado, foco, zoom, contraste, semântica e estados aplicáveis. Dados e renderização de screenshots devem ser determinísticos.
Executar lint, typecheck, testes afetados e build no pacote frontend antes de fechar uma etapa implementada; E2E para a jornada alterada. Backend exige seus checks quando houver mudança nele.
O E2E atual cria e remove containers próprios de PostgreSQL/Redis e exige portas 3000, 3333 e 4099 livres. Ler setup/teardown e não encerrar processos alheios.
Relatar o que foi executado, resultado, limites, arquivos e forma de reversão. Não declarar aumento de conversão, acessibilidade total ou produção validada sem evidência.
