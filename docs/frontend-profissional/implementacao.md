# Implementação e revisão das telas

Data: 15/10/2026. Execução autorizada pelo usuário para todas as telas, em lotes tecnicamente verificados. Este documento registra o resultado implementado; os documentos de proposta anteriores permanecem como histórico de decisões.

## Direção aplicada

Base: identidade própria navy/turquesa do Tem Link Aqui. A superfície esverdeada foi substituída por neutro frio para separar melhor conteúdo, controles e área de trabalho. Source Sans 3 permanece para leitura; Outfit unifica títulos, componentes e catálogo. Source Serif 4 deixou de ser carregada; o alias antigo foi preservado para os consumidores existentes.

Atlassian fundamenta hierarquia tipográfica, espaçamento e papéis; Linktree foi inspecionado para clareza de proposta/próxima ação, sem copiar sua identidade ou promessas; GOV.UK fundamenta identificação e recuperação de erros; referências de craft complementam foco, formulários e contraste. Refero não foi necessário como fonte exclusiva. A apresentação ilustrativa da landing está identificada como exemplo e não afirma audiência real.

## Mudanças concretas

- /divulgar ganhou composição própria, hierarquia clara, publicação gratuita, CTA derivado da sessão e processo de envio. Carregamento permanece exclusivo do servidor e apresentação fica em features/acquisition.
- SiteShell separa estrutura compartilhada do layout raiz, com navegação nomeada, atalho de teclado para o conteúdo e rodapé consistente. Links e destinos originais foram preservados.
- Tokens têm primitivas e nomes semânticos; aliases mantêm compatibilidade. globals.css virou um manifesto de imports ordenados. O CSS anterior foi separado em nove responsabilidades sem reordenar suas declarações: foundations, authentication, components, discovery, consent, catalog, workspace, promotions e operations.
- A área de sessão, proteção, suspensão e navegação saiu de panel.tsx para features/account/components/area-frame.tsx, com reexports compatíveis. O restante não sofreu uma reorganização artificial de toda a árvore.
- Field agora associa explicitamente label, controle, dica e erro; mantém ids e descrições externas. Button oferece loading, aria-busy e bloqueio enquanto aguarda. Estados comuns de vazio, erro e carregamento têm apresentação e semântica consistentes.
- Login, cadastro, recuperação de senha, novo envio e contestação recuperam o formulário após falha de rede. O envio mantém o rascunho e apresenta os campos em ordem adequada, com agrupamento semântico de tema/rede.
- Conta, pedidos e administração receberam contexto de tarefa e espaçamento consistente. Erros de configurações/estornos não são confundidos com sucesso ou lista vazia.
- Páginas não encontradas oferecem retorno ao catálogo e busca. Links no texto são distinguíveis sem depender somente de cor. A trilha identifica a página atual.
- A auditoria axe identificou e motivou correções na semântica de impressões e nos nomes acessíveis de arrastar planos e selecionar catálogos. A ordem de planos passou a poder ser alterada também pelas setas no teclado.

## Cobertura de navegação

A coleta real percorreu 31 destinos em 1440×900 e 390×844, incluindo alias, query de busca e página inexistente; são 62 capturas, não 31 templates diferentes. Não houve rolagem horizontal na coleta final em desenvolvimento.

A suíte de qualidade também percorre as seções internas da gestão e do painel e as abas de dados disponíveis, exercita abertura/fechamento do editor de planos, teclado e recuperação de falha na busca e no login. Os erros encontrados pela auditoria são corrigidos na aplicação; mudanças de localizadores de teste refletem o combobox real da busca e distinguem alertas da interface do anunciador de rotas do Next.

| Área | Destinos e estados observados |
| --- | --- |
| Descoberta | /, /busca, busca com consulta, /nicho/jogos, /rede/telegram e /link/:id |
| Aquisição/acesso | /divulgar, /login, /cadastro, /esqueci-senha e /recuperar-senha sem token |
| Informação/recuperação | /termos, /privacidade, /nao-encontrado e rota inexistente com 404 |
| Conta/publicação | /painel, alias /painel/visao, /painel/links, novo link, editar, destacar, contestar, pedidos, conta e verificar |
| Operação | /admin/visao, moderação, planos, configurações, integrações e estornos |

Usados somente dados do seed local e serviços de teste. Conteúdo como o nome de teste de XSS é fixture, não conteúdo de produção. Emulação mobile em Chromium não equivale a validação em aparelho físico. Visitas a uma rota não comprovam, sozinhas, todos os seus estados: a suíte funcional cobre as jornadas e a suíte de qualidade acrescenta acessibilidade/estados e screenshots estáveis.

## Catálogo de componentes

Storybook 10.6.2 com @storybook/nextjs-vite foi adicionado como ferramenta de desenvolvimento, sem biblioteca de UI. Stories cobrem ações primária/secundária/destrutiva, disabled, loading, navegação, campos com dicas/erros, feedback e landing. A prévia importa os mesmos tokens/estilos; sem next/font no ambiente isolado, usa fallbacks locais em vez de buscar fontes externas.

Executar npm run storybook no frontend para abrir o catálogo; npm run build:storybook produz a versão estática. Esta ferramenta tem custo de dependências de desenvolvimento e build, mas permite inspecionar estados fora das rotas. Não substitui o teste real de cookies, BFF, tenant e pagamentos.

## Regressão reproduzível

npm run test:visual usa playwright.visual.config.ts: verifica as jornadas públicas, de usuário e de administração em desktop/mobile, testa teclado, formulário e diálogos, procura controles sem nome e executa axe para critérios A/AA selecionados. Seis telas estáveis por viewport têm screenshots comparáveis; resultados mudam o status do teste, sem suprimir regras para obter verde.

As imagens iniciais foram produzidas no Windows/Chromium desta estação após revisão das capturas. Antes de executar comparação em Linux/CI, produzir e revisar baselines desse ambiente ou padronizar o runner. Não regenerar baselines automaticamente a cada execução. O comando normal deve passar comparando as imagens existentes, sem --update-snapshots.

O log do servidor de teste foi movido para e2e/.runtime/server.log, fora da pasta de resultados que o Playwright limpa. Isso preserva o diagnóstico durante execução e teardown. O caminho é ignorado pelo Git.

## Resultado das verificações

| Verificação | Resultado final |
| --- | --- |
| npm run lint | Passou. |
| npm run typecheck | Passou, incluindo código de frontend, testes E2E e configuração visual. |
| npm test | 109 testes em 33 arquivos passaram. |
| Build de produção Next | Passou nos setups reais das suítes E2E, sem iniciar build concorrente com a prévia de desenvolvimento. |
| npm run test:e2e | 48 passaram, sem testes pulados; inclui Pix, publicação, moderação, consentimento, conta suspensa e isolamento de tenant. |
| npm run test:visual | 12 passaram, sem --update-snapshots, sem testes pulados ou instáveis; inclui seções internas, diálogos, teclado e recuperação de rede. |
| npm run build:storybook | Passou; catálogo também inspecionado no navegador. |
| git diff --check | Passou. |

As verificações automáticas de acessibilidade cobrem regras A/AA selecionadas do axe nos estados exercitados; não certificam toda a WCAG nem substituem testes com pessoas. Os baselines são locais de Windows/Chromium. Os avisos de tamanho do bundle do Storybook e interpretação de use client pelo Vite pertencem ao ambiente de documentação, não são falha de build da aplicação. O Next ainda emite o aviso preexistente de múltiplos lockfiles.

Os processos de prévia e os containers de teste foram encerrados após a validação. O repositório mantém o código e as evidências necessárias para repetir os checks.

## Proteções de produto

Sem alteração de APIs, banco da aplicação, preços, cotas, elegibilidade, estado de publicação, consentimento ou eventos comerciais. Banco/Redis usados nas suítes são descartáveis de teste. A promessa atual de análise humana continua explicitamente pendente de reconciliação com a moderação automática condicional; não foi alterada como efeito visual.

Nenhum commit, push, deploy ou contratação de serviço foi realizado. 21st continua desativado por ausência de credencial. As melhorias usam componentes locais e ferramentas especializadas, sem adoção de Tailwind, shadcn ou Radix na aplicação.
