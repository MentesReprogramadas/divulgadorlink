# Minha página: identidade própria

Escopo autorizado em 17/10/2026: página pessoal inteira, personalização e marca discreta obrigatória. Esta evolução não altera planos, quotas, aprovação, segurança dos destinos nem publicação.

## Direção e referência

A organização por temas, cores, botões e texto é fundamentada na documentação oficial https://linktr.ee/help/en/articles/8614125-customize-linktree-design. Refero indisponível nesta sessão; referência aberta no navegador. Não copiar identidade. Editor neutro, opções visuais curadas e prévia imediata; publicação com fundo de ponta a ponta, coluna legível, foto e grupos. Sem card externo nem chrome do catálogo, exceção expressamente pedida para páginas pessoais e prévia. Rodapé pequeno com logo original e Criado por, sempre presente.

## Contratos e implementação

1. Persistir aparência tipada no agregado existente, snapshots e projeção. Migração aditiva com padrão para perfis existentes; aceitar apenas hex e enums, nunca CSS/HTML livre.
2. Reutilizar ProfileView no público, na prévia privada e no editor. Temas curados, fundo sólido/degradê, cor de fundo e botões, fonte, alinhamento, formato e estilo dos botões. Cor de texto derivada por contraste. Controles de cor próprios com paleta e código hexadecimal, acessíveis por teclado.
3. Reutilizar normalização local da foto: reduzir dimensões e converter em WebP antes do upload. Backend decodifica e recodifica com sharp para validar pixels e retirar metadados. PNGs existentes continuam legíveis. Justificativa da dependência: validação/recodificação de WebP real, sem parser de codec artesanal.
4. Preservar controle de versão, rascunho, publicação explícita, preview privado, idade, autorização e tenant. Marca não é configurável. SSR mantém canonical/robots e 404 real.

## Aceitação e validação

- Aparência persiste após recarregar e só muda a publicação após Publicar; preview salva antes de navegar.
- Público sem cabeçalho/rodapé do catálogo; fundo ocupa a tela; marca sempre no fim.
- Todos os temas e estilos legíveis em desktop/mobile, zoom, teclado e movimento reduzido. Sem overflow horizontal.
- Foto PNG/JPG/WebP vira WebP limitado, sem EXIF; arquivos inválidos e dimensões abusivas rejeitados pelo servidor; isolamento mantido.
- Unitários de aparência/cores/renderer/controle, testes de mídia reais e integração PostgreSQL; E2E de edição, persistência, prévia e publicação, com inspeção de capturas. Lint/typecheck/build de ambos os pacotes.

Execução local concluída; resultados e limites abaixo. Sem commit, push, CI remoto ou deploy desta extensão.

## Operação e reversão

A migração `20261017180000_profile_appearance` só acrescenta uma coluna JSONB opcional. Foi aplicada também ao banco de desenvolvimento confirmado em localhost:5437, onde era a única migração pendente. Não houve acesso de escrita a ambiente remoto. O upload novo é WebP e a leitura mantém MIME de PNG legado; uma reversão que sirva toda mídia como PNG é incompatível com assets novos.

Reversão segura prefere desligar os controles/tema mantendo o leitor compatível com appearance e mídia WebP. Para voltar integralmente ao código anterior, fazer backup dos snapshots e assets e tratar appearance das publicações (o parser anterior era strict) e conversão WebP→PNG com atualização dos hashes/referências antes do downgrade. Não remover a coluna nem reescrever publicações automaticamente. Nenhuma reversão executada.

## Referências técnicas e limites

Recodificação e remoção de metadados seguem [sharp Output options](https://sharp.pixelplumbing.com/api-output/), dimensões e pixels seguem [Constructor](https://sharp.pixelplumbing.com/api-constructor/). Instalada a série 0.34.5; não se usaram APIs recentes como toUint8Array da 0.35. A documentação consultada é atual, não uma cópia versionada de 0.34.5. Testes reais de decodificação/recodificação verificam o comportamento instalado.

Compressão não promete arquivo menor para toda imagem sintética pequena; garante conversão WebP, limites e redução de dimensões. PNG/JPG/WebP são os formatos de entrada suportados, sem HEIC. Não foi criado upload de capa ou vídeo de fundo nesta fatia. O rodapé da marca permanece independente da aparência.

Antes da leitura privada, skeleton usa a geometria da página e fundo neutro padrão; tema, quantidade de links e comprimentos reais só são conhecidos na resposta autenticada. Não se afirma equivalência pixel a pixel dos dados ainda desconhecidos.

O gerenciamento de cookies existente continua acessível no rodapé pessoal, acima da assinatura. Remover o chrome não retira o acesso ao consentimento nem instala rastreamento novo. O editor mostra essa composição apenas como simulação inerte; o modo de prévia privado continua separado.

## Arquivos principais

- Contrato/validação/persistência: `backend/src/domain/profiles/appearance.ts`, `profile-input.ts`, `profile.ts`, `repositories/profiles-repository.ts` e migração `20261017180000_profile_appearance`.
- Mídia: `frontend/src/features/profiles/prepare-avatar.ts`, `backend/src/domain/profiles/avatar-webp.ts`, `repositories/profile-media.ts` e rotas existentes de perfil. sharp adicionado ao package/lock do backend.
- Apresentação: `features/profiles/profile-appearance.ts`, `components/profile-appearance-editor.*`, `profile-view.tsx`, `personal-page.module.css`, editor/skeletons existentes e `components/layout/site-shell.tsx`.
- Primitiva: `components/ui/color-picker.*`, story e testes; TabNavigation aceita ausência de callback no skeleton servidor.
- Regressão: `frontend/e2e/profiles.spec.ts`, `playwright.profiles-visual.config.ts` e snapshots Windows. Execução funcional normal não depende de baseline visual de outro sistema operacional.

## Resultados e evidências — 17/10/2026

| Verificação | Resultado / evidência local |
| --- | --- |
| Frontend unitários | 227 aprovados, 70 arquivos; `output/panel-redesign/personal-unit-final-ui.log`. Inclui contratos antigos preservados, conversão local, cores, editor e prévia. |
| Backend unitários completos | 435 aprovados, 105 arquivos, execução observada nesta sessão. Recorte final de perfis/mídia: 23 aprovados, `personal-media-final.log`, incluindo entrada WebP com EXIF e saída sem metadados. |
| PostgreSQL real | 11 aprovados, `personal-pg-complete.log`: aparência privada, publicação explícita, isolamento, idade e mídia. Banco descartável em 5533. |
| Jornada E2E final | 12 aprovados, zero skip/retry, desktop 1280×800 e mobile 390×844; `personal-e2e-accepted.log` e `personal-e2e-accepted-results.json`. Inclui seis temas com Axe, teclado/RGB, conteúdo real, fotos PNG/JPG/WebP, offline, conflito, 320 px/texto 200%, consentimento e prévia. |
| Compilação | Build Next de produção em cópia isolada via runner existente (`TEMLINK_E2E_BUILD=1`, `.next-e2e`), `personal-build-accepted.log` e log do servidor; backend tsup aprovado (`personal-backend-build.log`). Lint e typecheck de ambos aprovados. |
| Storybook | Build aprovado, `personal-storybook-accepted.log`, com story interativa do seletor de cores. |
| Comparação visual final | 2 casos aprovados, com 4 comparações de imagem (editor/público × desktop/mobile); `personal-visual-accepted.log`. Inclui a verificação adicional de 320 px/texto 200% e gerenciamento de cookies. |
| Inspeção visual | 22 capturas em `evidencias/minha-pagina-2026-10-17`: seis temas em dois tamanhos, editor/público, preview pendente/pronto e texto ampliado. Inspeção humana identificou e corrigiu quebra do seletor que o overflow automático não detectava. |

A comparação visual usa `npx playwright test --config playwright.profiles-visual.config.ts`. Foram aprovadas manualmente quatro imagens Windows (editor/público × desktop/mobile) antes de copiá-las para snapshots; não se usou update-snapshots automático nem tolerância ampliada. A execução funcional padrão do CI continua sem dependência dessas imagens; baseline Linux deve ser produzido e revisado no ambiente próprio antes de habilitar comparação lá.

Validação anterior ao fechamento encontrou erro de fronteira servidor/cliente no skeleton e uma corrida do teste com o título da prévia. As tentativas vermelhas ficam nos logs de iteração; não são contadas como aprovação. Teste final aguarda o título definido pela rota. Iterações posteriores corrigiram apenas legibilidade em zoom e a preservação do gerenciamento de cookies, com novo build e nova execução completa da jornada.

Não se afirma acessibilidade total, comportamento em aparelho físico ou produção validada. Os testes usam Chromium em Windows, emulação mobile e provedores externos simulados; API/BFF/PostgreSQL e processamento de imagem são reais. Os processos do usuário em 3000/3333 permanecem; serviços e containers exclusivos de validação são encerrados. Cópia temporária retida após bloqueio da política de execução à remoção, sem contornar essa restrição.

## Complemento — marca e revisão de conteúdo, 17/10/2026

A assinatura passou a texto de 9 px e logo de 66 px, sem cápsula ou fundo, no rodapé da página e da prévia. Os quatro snapshots Windows foram comparados e aprovados após inspeção: as diferenças estão restritas à marca. A publicação de Minha página e Convites agora usa decisão automática ou fila humana por categoria, motivo de recusa e uma contestação por envio, por novo pedido expresso. As regras anteriores de bloqueio editorial definitivo foram superadas; bloqueios técnicos de segurança continuam obrigatórios. Histórico desta personalização permanece acima.

Contrato, migração, critérios, resultados (229 unitários frontend, 436 backend, 46 PostgreSQL, 44 E2E e duas jornadas visuais), limites e reversão em [Revisão de páginas e convites](revisao-paginas-convites.md). Na primeira entrega a revisão destes tipos ocorria no admin. O pedido seguinte ampliou a decisão para WhatsApp, registrado no complemento do mesmo documento.
