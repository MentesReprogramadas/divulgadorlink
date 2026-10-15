# Arquitetura frontend e convenções

Estado: arquitetura alvo para adoção por funcionalidade após aprovação do piloto. Não é uma instrução para mover arquivos em massa.

## Estrutura alvo

```text
frontend/src/
  app/                         rotas, layouts, metadados, BFF e composição
  components/
    ui/                        controles sem semântica comercial
    layout/                    Container, PageHeader e estrutura compartilhada
    forms/                     composição de campos e mensagens
    feedback/                  estados comuns e recuperação
  features/
    acquisition/               landing e contexto de aquisição
      components/
      server/                  carregamento exclusivo do servidor
    catalog/                   busca, facetas, resultados e patrocinados
    link-submission/           rascunho, envio e resultado de análise
    promotions/                elegibilidade apresentada e jornada de destaque
    account/                   verificação, sessão e conta
    administration/            composição de operações administrativas
  domain/                      regras puras, rótulos e conceitos já existentes
  lib/                         transporte e infraestrutura atuais
  styles/
    tokens.css                 ponto de entrada compatível durante a migração
    primitives.css             valores fundamentais, quando extraídos
    semantic.css               papéis de tokens, quando aprovados
```

Criar somente diretórios usados pela fatia em execução. Manter componentes legados em components/domain enquanto ainda tiverem consumidores; mover um arquivo deve ter benefício concreto e atualizar seus imports na mesma entrega.

## Direção de dependências

app → features e layout → UI/feedback/forms. Features podem usar domain e lib através de carregadores, adapters ou hooks com responsabilidade clara. Domain não importa React, Next, componentes ou transporte. UI não importa features, sessão ou APIs de negócio. Lib não importa UI. Evitar imports profundos entre features; extrair um contrato compartilhado somente quando houver consumidores reais.

Não adicionar uma pasta infrastructure duplicando lib. A responsabilidade de infraestrutura já existe: api.ts, upstream.ts, cookies/BFF e resolução de tenant. Nomes melhores podem ser adotados quando uma extração for necessária, mantendo compatibilidade.

## Conceitos do produto

| Conceito | Composição candidata | Responsabilidade preservada |
| --- | --- | --- |
| Link de catálogo | CatalogLink / LinkRow existente | Nome, destino, facetas, patrocinado e contexto de métricas. |
| Estado do envio | SubmissionStatus | Exibir o estado retornado, sem decidir publicação. |
| Destaque | PromotionSummary | Explicar superfície, duração e preço recebido; não recalcular elegibilidade. |
| Verificação | VerificationNotice | Orientar a próxima ação conforme capacidade da sessão. |
| Conta suspensa | SuspendedAccount existente | Exibir motivo e ações permitidas, sem contornar bloqueios. |

Esses são nomes candidatos, não componentes a gerar de antemão. Preservar LinkRow quando já resolver o conceito. Semântica comercial pertence à feature; componente de domínio não significa colocar regras de servidor no React.

## Fatia inicial de /divulgar

Após aprovação, app/divulgar/page.tsx continua Server Component e mantém metadados/dinamicidade. Extrair loadCta para features/acquisition/server/load-advertise-cta.ts apenas se melhorar a separação e testabilidade. O carregador usa lib/upstream e domain/advertise; uma apresentação AdvertiseLanding recebe o CTA e conteúdo tipados e usa CSS Module. Sem fetch no componente visual, sem novo provider global.

O cabeçalho/rodapé do layout raiz não será substituído como efeito da landing. Uma melhoria compartilhada deve considerar consumidores e ter teste próprio. Não converter a página inteira para cliente para implementar um estado de botão.

## Convenções

- Arquivos kebab-case; componentes PascalCase; hooks useNome; tipos de props NomeProps. Nomes expressam produto ou função, não posição vaga como Box2 ou Widget.
- Tipar fronteiras: props, resposta consumida de API e estados. Usar uniões discriminadas para modos mutuamente exclusivos. Não substituir validação do servidor por coerção TypeScript.
- Separar dados derivados de estado mutável; não guardar em useState algo calculável das props. Effects apenas para sincronização externa, com limpeza quando necessária.
- Usar props HTML nativas nas primitivas. Não adicionar isPrimary/isSecondary/isDanger concorrentes; preferir variant. Estados de requisição com loading/disabled e anúncio acessível conforme o controle.
- Preferir children e composição a componentes com dezenas de flags, schema de layout ou configuração universal. Extrair quando houver responsabilidade clara ou repetição real, não para atingir contagem de linhas.
- Navegação usa link; ação usa button com type explícito quando pertinente. Next Link pode ser usado internamente sem reescrever todos os anchors numa entrega de estilo.
- Preservar o estilo de código do arquivo. Registrar diferenças existentes de aspas/ponto e vírgula; não adicionar formatter ou regra de lint indiscriminadamente.
- Estados async devem distinguir falha de transporte, ausência de conteúdo e ausência de permissão. Mensagem de erro oferece recuperação viável e não perde dados preenchidos.

## CSS por responsabilidade

Global: tokens, reset, tipografia base e utilitários globais deliberados. Layout: estrutura responsiva e limites. Componentes: CSS Module junto do TSX. Features: composição específica da jornada. Não usar classes de outra feature como contrato público.

Tokens de componente podem mapear tokens semânticos quando houver necessidade: button-background → action-primary-background → brand-900. Não criar aliases sem uso. Manter tokens antigos como ponte até migrar os consumidores; apagar apenas depois de verificar referências.

Antes de mover uma regra global, identificar todos os seletores/consumidores e capturar páginas afetadas. Uma extração fiel e uma mudança visual grande devem ser revisáveis separadamente. Evitar !important e seletores que dependem da posição acidental no DOM.

## Testes por fronteira

Domain: entradas, saídas e limites. Primitivas: interação e acessibilidade relevantes. Features: estado e composição observáveis. Rotas: contratos de sessão/tenant/metadados. E2E: jornada real. Screenshot: renderização determinística e comparação humana do alvo. Não criar testes que apenas repetem classes ou a implementação.
