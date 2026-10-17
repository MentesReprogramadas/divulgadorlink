# Minha página: criação e organização — 17/10/2026

## Pedido e diagnóstico

Separar criação e manutenção, tornar grupos reconhecíveis em cards e permitir abrir, editar, remover e ordenar grupos/links sem exibir todos os formulários juntos.

O editor anterior mantinha o assistente mesmo com rascunho existente, renderizava cada grupo com todos os links e vários botões de ordem e criava registros vazios antes de concluir seus diálogos. Aparência ficava separada das decisões da revisão final.

## Fluxos implementados

**Primeira criação:** Sua página → Foto e acesso → Grupos e links → Revisar e publicar. A revisão oferece Personalizar aparência e mantém prévia privada, salvamento e publicação explícita. Criar grupo abre o grupo recém-criado e orienta a adicionar o primeiro link. Cancelar a criação não insere um grupo ou link incompleto no rascunho.

**Rascunho existente:** entrada direta nos cards dos grupos. Áreas Grupos e links, Sua página, Foto e acesso, Aparência e Publicação. Desktop usa abas; mobile usa seletor com todos os destinos, evitando opções fora da tela. Salvar e publicar continuam sendo ações distintas.

**Grupo aberto:** somente seus links ficam visíveis. Voltar aos grupos preserva a orientação e o foco. Editar grupo altera nome/visibilidade. Adicionar/editar link usa diálogo próprio e conserva URL, rede social e vínculo com catálogo. Mover e remover reúne operações secundárias, mantendo as linhas compactas. Remover grupo avisa explicitamente que remove seus links da página; links do catálogo permanecem no catálogo.

**Organização:** alças para arraste por mouse, toque ou caneta; setas do teclado na alça e botões de subir/descer como alternativas. Reordenação insere na posição escolhida, preservando a ordem relativa dos demais. Transferir para outro grupo coloca o link ao final do destino, conservando identidade, tipo, URL, visibilidade e botão principal. A exclusão limpa o botão principal somente quando seu link é removido. Alterações ficam locais até salvar/publicar.

## Direção visual e referências

Referência principal solicitada: cards e abertura de recurso em Convites permanentes e Coleções do próprio produto. Cards identificam grupos; linhas compactas identificam links. Não se aplicou o mesmo formato indistintamente a toda a tela.

Foram mantidos os tokens vigentes: superfícies #f6f8fb e #ffffff, texto #142339/#5c6b7f, ação navy #0a192f e borda #dce3ec. Outfit para títulos, Source Sans 3 para conteúdo/controles; escala e espaçamento existentes. Sucesso, erro e atenção usam texto e caixas destacadas. Nenhuma biblioteca nova ou fonte adicional.

A implementação nativa usa [captura de ponteiro documentada pela MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture). Os controles de clique/toque alternativos seguem o objetivo de [WCAG 2.2, movimentos de arrastar](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html); conformidade total não foi certificada.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| Frontend lint e typecheck, incluindo E2E | Passaram |
| Unitários afetados: perfis, organização, ordem anterior e ícones de navegação | 31 testes passaram, 10 arquivos |
| Build de produção Next 15.5.26 pelo setup existente, em `.next-e2e` | Passou |
| `profiles.spec.ts` + `content-reviews.spec.ts`, projetos features e features-mobile | 19 testes passaram na execução final, sem retry |
| `profiles.spec.ts` + `loading-layout.spec.ts`, filtro `F09-E05\|L01 painel`, mesmos projetos | 5 testes passaram, incluindo setup, repetição da gestão e carregamento lento |
| DnD | Grupos e links por mouse no desktop e eventos reais de toque no Chromium mobile emulado |
| Teclado/foco | Setas nas alças, abertura do grupo, foco no título, confirmações, cancelamento e retornos de sucesso |
| Persistência | Transferência, edição e ordem confirmadas após salvar e recarregar |
| Remoções | Cancelar e confirmar remoção de link/grupo; grupo remanescente preservado |
| Acessibilidade automática | axe sem violações nos estados exercitados, incluindo temas, links do grupo, prévia e loading |
| Reflow | 320 px e texto raiz a 200%, sem overflow horizontal nos estados exercitados |
| Contratos anteriores | Seis temas, cores, foto PNG/JPG/WebP, botão principal, conteúdo oculto, idade, prévia, publicação, revisão humana, contestação, isolamento e conflito entre abas passaram |

Comandos no frontend: `npm run lint`, `npm run typecheck`, `npm test -- src/features/profiles src/domain/profile-order.test.ts src/components/layout/navigation-icons.test.tsx`. E2E com `E2E_PORT_OFFSET=3200` e `E2E_RUN_ID=profile-organization-20261017`, reaproveitando setup/teardown do projeto. Web 6200, API 6533, stub 7299, HTTPS fixture 7643, PostgreSQL 8633 e Redis 9580. Serviços existentes preservados; containers próprios encerrados pelo teardown.

Uma execução intermediária encontrou uma corrida no helper mobile após reload: ele procurava a aba desktop antes de o seletor aparecer. O helper passou a aguardar a navegação renderizada; a execução final completa passou. A comparação de loading foi adaptada à resposta desconhecida: ainda preserva cabeçalho, largura e controles inertes, mas não presume altura idêntica entre um cadastro vazio e uma página com quantidade desconhecida de grupos.

## Capturas inspecionadas

Dados sintéticos, fontes carregadas, movimento reduzido e animações desativadas. Gestão em 1440×900 no desktop e 390×844 no mobile; carregamento/criação em 1280×720 e 390×844. Não se atualizaram baselines automaticamente.

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Primeira criação | [Criação](creation-desktop.png) | [Criação](creation-mobile.png) |
| Gestão por grupos | [Cards](groups-overview-desktop.png) | [Cards](groups-overview-mobile.png) |
| Links de um grupo | [Links](group-links-desktop.png) | [Links](group-links-mobile.png) |
| Espera da resposta | [Loading](loading-desktop.png) | [Loading](loading-mobile.png) |

A inspeção visual levou à redução da altura das linhas de links, à concentração das ações secundárias, à redução de instruções repetidas e ao seletor de navegação mobile. Emulação não substitui aparelho físico. Não houve medição de conversão/desempenho em campo nem validação em produção. Avisos de configuração do build já presentes no projeto não foram tratados nesta fatia.

## Arquivos e reversão

- Composição: `frontend/src/features/profiles/profile-editor.tsx`.
- Campos e loading: `components/profile-fields.tsx`, `profile-editor-skeleton.tsx` e `profiles.module.css`.
- Organização: `profile-organization.ts`, `components/profile-group-manager.tsx`, `profile-link-list.tsx`, `use-profile-sort.ts` e `profile-groups.module.css`.
- Testes novos: `profile-organization.test.ts` e `components/profile-group-manager.test.tsx`. E2E adaptados: `profiles.spec.ts`, `content-reviews.spec.ts` e `loading-layout.spec.ts`.

Arquivos de aplicação sem alteração de dependências, backend, regras de revisão, permissões, tenant, publicação, SEO ou analytics. O workspace já tinha alterações locais; elas foram preservadas.

O patch exclusivo desta etapa está em `output/profile-organization/changes.patch`. `git apply -R --check output/profile-organization/changes.patch` passou contra o estado final. Para desfazer somente esta fatia, revisar esse patch e aplicar a reversão a partir da raiz; cópias dos arquivos anteriores estão em `output/profile-organization/before`. Não restaurar arquivos inteiros a partir de HEAD. Evidências desta pasta podem ser removidas separadamente.
