# Piloto /divulgar e critérios de qualidade

Estado: execução autorizada pelo usuário em 15/10/2026, incluindo a sequência das demais telas. A validação permanece obrigatória; não é necessário solicitar novamente aprovação entre lotes.

## Brief de produto

Público: quem quer publicar site, grupo ou perfil no catálogo. Origem relevante: aquisição por anúncio e acesso direto. Objetivo da página: entender a proposta e iniciar ou retomar o envio. Objetivo comercial: aumentar envios válidos e publicados; destaque pago só aparece como opção posterior e elegível.

Não transformar a landing no catálogo nem sugerir publicação instantânea. Preservar cabeçalho, busca, logo para /, conteúdo permitido, SSR, metadados e rotas. O texto de análise humana precisa de reconciliação com a automação condicional do backend antes de uma alteração de promessa.

## Escopo do piloto autorizado

1. Capturar baseline real em mobile/desktop, incluindo cookie banner, foco e comportamento do CTA. Registrar dados, ambiente e estado de sessão; capturas não contêm dados reais de usuários.
2. Inspecionar visualmente referências reais e a landing atual. Escolher uma direção dominante e papéis específicos das referências secundárias. Registrar escolhas de tipografia, superfície, espaço, densidade e hierarquia com justificativa.
3. Compor /divulgar com proposta clara, publicação gratuita, processo de envio e próximo passo. Se houver exemplo de entrada de catálogo, identificá-lo como ilustrativo e usar conteúdo permitido. Sem números ou depoimentos inventados.
4. Implementar a fatia com separação de carregamento e apresentação, CSS local e componentes existentes. Introduzir só os tokens/primitivas necessários. Não extrair todas as telas, criar árvore vazia ou atualizar frameworks.
5. Executar verificações, comparar baseline/alvo/implementação e corrigir diferenças acionáveis. Apresentar capturas e diff para validar o piloto antes de consolidar padrões e migrar outras páginas.

## CTA e estados funcionais

| Estado | Contrato atual | Verificação |
| --- | --- | --- |
| Visitante | /cadastro, Publicar um link | Navegação real e retorno esperado. |
| Sessão sem canSubmit | /painel/verificar, Confirmar e-mail | Verificação não pode ser contornada. |
| Sessão com canSubmit | /painel/links/novo, Publicar um link | Formulário, rascunho, envio e resultado coerentes. |
| Sessão inválida ou erro do upstream | Fallback atual de advertiseCta(null) | Sem travamento, erro silencioso não vira permissão. |
| Conta suspensa | Bloqueio nos contratos atuais de painel/API | Não criar atalho para publicar ou comprar; revisar CTA separadamente se necessário. |
| Consentimento pendente/negado/aceito | Banner e first touch atuais | Sem marketing antes do aceite; consentimento não é obrigatório para publicação. |

Para landing renderizada no servidor, loading de requisição não é um botão fake no cliente. Validar navegação e eventual fallback de rota apenas se introduzido. Estados sem aplicação devem ser marcados como tal; não criar UX artificial para preencher checklist.

## Matriz de validação

| Dimensão | Aceite |
| --- | --- |
| Mobile e desktop | Chromium real; 390×844 e 1440×900 como capturas principais; verificar 320, 768 e 1280 px, nomes longos e zoom. Emulação mobile não equivale a teste em aparelho físico. |
| Semântica | Landmarks coerentes, h1 principal, hierarquia de títulos, links e botões por função, nomes acessíveis. |
| Teclado | Tab e Shift+Tab previsíveis; foco visível; nenhuma armadilha; consentimento e diálogos acessíveis. |
| Contraste e leitura | Meta WCAG 2.2 AA: 4,5:1 para texto normal, 3:1 para texto grande; validar também controles e foco aplicáveis. Teste automático não certifica conformidade total. |
| Estados | Hover, focus e disabled nas primitivas; loading/erro/vazio/sucesso nas composições em que existirem. Rede lenta e falha do upstream verificadas. |
| Produto | URLs/CTA, gratuito versus destaque, elegibilidade, conteúdo permitido, tenant e sessão preservados. |
| Privacidade e mensuração | Nenhum novo dado pessoal em eventos; primeiro toque e consentimento preservados. Publicidade identificada e métricas mantêm significado. |
| Visual | Comparação humana com direção aprovada; sem overflow da página, sobreposição de banner, texto cortado ou mudança inesperada de layout. |
| Engenharia | Lint, typecheck, testes relevantes, build e E2E da jornada passam; alterações sem relação com a etapa ficam fora do diff. |
| Desempenho | Registrar baseline e após na mesma condição; investigar regressão de LCP/CLS/INP e JS/fontes. Não usar pontuação isolada de Lighthouse como garantia de conversão ou dados de campo. |

## Regressão visual

Usar Playwright Test e expect(...).toHaveScreenshot nas páginas/estados estáveis. Fixar browser, sistema de execução, viewport, dados de seed e fontes; esperar fonts.ready e conteúdo estável. Desabilitar animações para comparação e controlar conteúdo temporal. Mascarar somente dados variáveis inevitáveis, nunca o CTA ou a região alterada.

Baselines de Windows e Linux podem divergir: escolher o ambiente de CI como referência e produzir nele as imagens aprovadas. Não usar a imagem atual como baseline automaticamente, não aumentar tolerância para esconder regressão, não executar --update-snapshots sem revisão das diferenças. Anexar expected/actual/diff e registrar quem aprovou o alvo.

O projeto atual só tem features-mobile para evolution-moderation, não cobertura móvel geral de /divulgar. Acrescentar cobertura da landing no piloto sem fazer o novo teste sumir dos testMatch atuais. Não alterar todo o runner para uma tela.

## Comandos e ambientes

No pacote frontend: npm run lint; npm run typecheck; npm test; npm run build; npm run test:e2e. São comandos distintos, não um script de migração. Durante iteração, começar pelos testes afetados e executar o fechamento completo quando a fatia estiver pronta.

O E2E existente usa Docker, PostgreSQL em 5433, Redis em 6380 e serviços em 3000/3333/4099; cria e remove containers divulgador-e2e-pg e divulgador-e2e-redis. Verificar recursos e portas antes de iniciar. Não conectar a suíte a banco de produção nem matar processos para liberar portas. Configurar dados de teste para não enviar e-mail, WhatsApp ou cobrança reais.

Na fase de consolidação, adicionar automação de acessibilidade se reduzir trabalho repetido, apresentando antes o custo da dependência e o escopo. Revisão manual de teclado/leitura continua necessária. Storybook usa mocks de infraestrutura e estados; não prova o fluxo completo do servidor.

## Revisão e reversão

Entregar: problema e impacto, decisões com fontes, arquivos alterados, capturas desktop/mobile, estados e testes executados, riscos e limitações. O diff do piloto deve permitir reverter seus componentes, estilos e tokens novos sem desfazer alterações do usuário. Não executar git reset/revert automaticamente; manter o patch revisável.

Consolidar componentes e documentação em Storybook após verificar o piloto e validar reúso nas jornadas seguintes. A autorização atual inclui todas as telas; o avanço depende dos checks técnicos, sem novas pausas para a mesma aprovação.
