# Minha página — pesquisa de produto, design, mídia e 3D

Data: 25/10/2026, America/Sao_Paulo. Branch observada: `codex/roadmap-f37-testes`.
Estado: pesquisa e recomendação; não comprova implementação ou disponibilidade comercial.

Documentos derivados: [spec](2026-10-25-minha-pagina-studio-design.md) e [plano](../plans/2026-10-25-minha-pagina-studio.md).

Complemento solicitado: [bibliotecas, componentes, assets, MCPs e skills prontos](2026-10-25-minha-pagina-bibliotecas-prontas.md). A análise favorece reuso seletivo de motores e efeitos, com licenças verificadas por artefato; atualiza a abordagem técnica sem ampliar a matriz comercial.

## 1. Pergunta e método

Como evoluir Minha página de um perfil com temas básicos para um editor profissional, expressivo e funcional, com layouts, cards com mídia, componentes, animações e 3D?

O usuário autorizou pesquisa abrangente, escolha fundamentada de escopo e criação da spec seguida do plano, antes de qualquer código. Confirmou que a personalização pertence às páginas dos usuários, e não ao tema global da plataforma. Nesta etapa foram escritos apenas documentos e registradas capturas de referências públicas; nenhum pacote, serviço, plano comercial ou código de aplicação foi alterado.

Método: pesquisa pública na internet; leitura de páginas oficiais de produto e documentação; confronto com o grafo e fontes locais; inspeção de quatro referências em navegador automatizado. As fontes de galerias são referências visuais, não prova técnica ou licença para copiar. Recomendações próprias estão identificadas; alegações promocionais não são evidência de conversão. Não houve compra, login, teste de checkout ou exploração autenticada dos editores concorrentes. Refero não consta entre as ferramentas disponíveis nesta sessão.

O grafo foi consultado por `ProfileAppearance` na análise anterior e por `profileCapabilities` nesta rodada; a consulta de capacidades foi truncada e serviu apenas de orientação. As conclusões abaixo foram confirmadas nos arquivos atuais. Não houve reconstrução do índice, porque esta entrega não modifica o código consultado.

## 2. Concorrentes e referências de fluxo

| Fonte lida em 25/10/2026 | Evidência observada | Implicação proposta para Minha página |
| --- | --- | --- |
| [R01 Linktree — design](https://linktr.ee/help/en/articles/8614125-customize-linktree-design) | Separa tema, cabeçalho, fundo, botões e texto; descreve prévia desktop/mobile. | Separar tarefas no editor e mostrar conteúdo real durante ajustes. |
| [R02 Linktree — temas](https://linktr.ee/help/en/articles/5434137-choose-linktree-theme) | Distingue temas curados e personalizáveis. | Tema pronto deve ser ponto de partida; preservar ajustes por camada. |
| [R03 Linktree — imagem e vídeo de fundo](https://linktr.ee/help/en/articles/5434177-add-custom-image-video-background) | Documenta envio de imagem/vídeo, prévia e salvamento; alerta para legibilidade. | Fundo precisa de recorte, proteção do texto e versão estática. Não copiar seus limites como contrato local. |
| [R04 Linktree — planos](https://linktr.ee/s/pricing) | Apresenta diferenciação por design, integrações e recursos de crescimento. | Cobrar por capacidade nova e custo operacional, preservando o editor gratuito atual. Não adotar sua remoção de marca. |
| [R05 Linktree — templates](https://linktr.ee/s/templates) | Organiza exemplos por atividade e estilos. | Separar a atividade do dono da estética escolhida; comunidade pode usar qualquer estilo. |
| [R06 Beacons — planos](https://help.beacons.ai/en/articles/4695681) | Inclui personalização no gratuito e separa recursos comerciais entre níveis pagos. | Gratuito deve gerar uma página que a pessoa queira divulgar. Evitar vender beleza básica como correção de um produto deliberadamente limitado. |
| [R07 Carrd — Pro](https://carrd.com/pro) | Diferencia templates, mídia, formulários, domínios, integrações e recursos avançados. | Um produto de páginas pode monetizar operação e composição avançada. Não importar código livre, cobrança ou remoção de marca por analogia. |
| [R08 Bio Sites](https://biosites.com/) | Apresenta templates, edição por arrastar, layouts, fontes, cores e blocos de diferentes mídias. | Cards e seções precisam ter formatos próprios, além da lista de botões. |
| [R09 Framer — design](https://www.framer.com/design/) | Apresenta canvas, camadas, assets e composições bastante distintas. | Inspiração para seleção direta e controles contextuais; não reproduzir de início um editor vetorial completo. |
| [R10 Webflow — interações](https://help.webflow.com/hc/en-us/articles/42832301823635-Intro-to-Interactions-with-GSAP) | Modela interação por gatilho, alvo e ações. | Animação deve ser editável como configuração, com prévia, limites e alternativa sem movimento. |
| [R11 Webflow — timeline](https://help.webflow.com/hc/en-us/articles/42861689104531-Timeline-in-Interactions-with-GSAP) | Organiza ações e duração em uma sequência visual. | Sequências avançadas podem ter editor simplificado; timeline completa não é requisito para a primeira onda. |
| [R12 Taplink — planos](https://taplink.at/en/pricing/) | A página acessível distingue básico e pago; sua tabela dinâmica completa não foi recuperada. | Confirma um padrão geral de níveis, mas não sustenta uma comparação detalhada de recursos ou valores. |

Preços de concorrentes não foram convertidos em preços locais. A página comercial e o help de Beacons recuperados apresentavam conteúdo/valores diferentes entre busca e abertura; a leitura direta mais recente foi preferida. Isso reforça não usar snippets como fonte de preço definitivo. Carrd redirecionou de `carrd.co` para `carrd.com`; foi preservado o destino oficial recuperado.

### Síntese de produto — inferência da pesquisa

1. Tema, template e layout são conceitos diferentes. Tema define identidade; template resolve uma atividade; layout organiza conteúdo.
2. A liberdade precisa existir também no conteúdo: intercalar links, imagens, títulos, galerias, vídeos e chamadas.
3. O editor deve oferecer um caminho curto e outro avançado, compartilhando os mesmos dados e publicação.
4. Bonito sem legibilidade, carregamento previsível e links funcionais não satisfaz o pedido.
5. Nenhuma fonte comprova que determinado efeito aumentará conversão neste produto. Essa hipótese exige medição posterior.

## 3. Pesquisa de linguagem visual

| Fonte | O que fundamenta | Limite |
| --- | --- | --- |
| [R13 Framer — design](https://www.framer.com/design/) | Variedade de composição, escala tipográfica e combinação de fotografia/objetos. | Página de divulgação; não foi realizada auditoria do editor autenticado. |
| [R14 Bio Sites](https://biosites.com/) | Diversidade visual entre páginas pessoais e cards com mídia. | Captura da apresentação comercial, não aprovação de suas métricas ou claims. |
| [R15 One Page Love — páginas pessoais](https://onepagelove.com/genre/personal) | Descoberta de composições pessoais reais. | Curadoria não garante acessibilidade ou desempenho. |
| [R16 Tim Van Damme — referência editorial](https://onepagelove.com/tim-van-damme-max-voltar) | Exemplo documentado de papel, fotografia em retícula, colunas e intervenção manuscrita. | Avaliada a ficha da galeria; o site de destino não foi auditado nesta rodada. |
| [R17 Awwwards — experimental](https://www.awwwards.com/websites/experimental/) | Exploração de materiais e interações além do padrão link-in-bio. | A listagem foi recuperada; páginas 3D e tipografia tiveram timeout. Não alegar inspeção de todos os sites listados. |
| [R18 MoMA — Josef Müller-Brockmann](https://www.moma.org/artists/4154-josef-muller-brockmann) | Acervo para estudar relações entre tipografia, geometria e organização no tema Swiss. | Obras não são assets liberados para uso no produto. A tradução para interface é proposta nossa. |
| [R19 V&A — surrealismo e design](https://www.vam.ac.uk/articles/surrealism-and-design) | Relações inesperadas de escala, objeto e contexto para Surreal. | Referência cultural; não copiar obras ou seus conteúdos como decoração. |

Os 20 nomes solicitados misturam movimentos, épocas, técnicas e materiais. Não devem ser tratados como taxonomia histórica única. Cada tema terá uma ficha própria com tipografia, composição, cores, cards, grafismos, movimento, exemplos mobile e alternativa de alto contraste. A spec define a tradução proposta, sem atribuí-la aos museus ou às galerias.

### Inspeção de referências em navegador

Capturas locais, abertas e examinadas nesta pesquisa:

- `output/minha-pagina-research-2026-10-25/framer-design.jpg`: contraste tipográfico e diversidade de composição. O consentimento estava visível; não foi aceito.
- `output/minha-pagina-research-2026-10-25/bio-sites.jpg`: mistura de identidades e cards com imagem/vídeo. O consentimento estava visível; não foi aceito.
- `output/minha-pagina-research-2026-10-25/model-viewer-loading.jpg`: demonstração oficial de modelo 3D com conteúdo/documentação ao lado.
- `output/minha-pagina-research-2026-10-25/linktree-templates.jpg`: biblioteca oficial de temas, para observar diferenciação e navegação entre alternativas; não representa teste do editor.

As capturas são evidência de pesquisa, não arquivos para integrar ao produto. Os logs de Framer apresentaram erros de recursos de terceiros e Bio Sites apresentou avisos; não se tomou esse ambiente como benchmark. As páginas de templates do Linktree foram lidas; não se concluiu teste de seu editor. A URL `/templates` é um perfil e foi descartada; a biblioteca oficial observada é `/s/templates`.

## 4. 3D: opções reais e decisão proposta

| Caminho | Fontes oficiais | Adequação | Decisão proposta |
| --- | --- | --- | --- |
| Imagem 3D pré-renderizada | Técnicas usuais de imagem; acervos R25/R26 | Aparência de volume sem runtime 3D. | Disponível como fundo e ilustração; nunca anunciar como interativo. |
| CSS/Canvas decorativo | [R20 Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | Aurora, formas, paralaxe moderada e efeitos previsíveis. | Primeiro caminho para efeitos que não exigem geometria real. |
| Three.js | [R21 manual glTF](https://threejs.org/manual/pages/load-gltf.html), [otimização](https://threejs.org/manual/pages/optimize-lots-of-objects.html) | Cenas próprias, iluminação, câmera e fundos procedurais. | Candidato preferido para um runtime 3D único e carregado sob demanda; adoção exige spike e revisão de dependência. |
| model-viewer | [R22 exemplos de loading](https://modelviewer.dev/examples/loading/), [documentação](https://modelviewer.dev/) | Um objeto GLB interativo em um bloco, com poster. | Alternativa forte para visualizador de objeto. Não carregar junto de Three.js sem necessidade comprovada. |
| Spline | [R23 exportação como código](https://docs.spline.design/exporting-your-scene/web/exporting-as-code), [self-hosted](https://docs.spline.design/exporting-your-scene/web/exporting-as-self-hosted-project) | Autoria visual de cenas e integração pronta. | Integração opcional futura. Exportação self-hosted completa está descrita como Enterprise; não assumir gratuidade ou ausência de requisições externas no export comum. |
| Rive | [R24 runtime web](https://rive.app/docs/runtimes/web/web-js) | Interações vetoriais e máquinas de estado. | Comparar com dotLottie em spike; não são substitutos de um motor 3D. |
| dotLottie | [R24b formato](https://lottiefiles.com/dotlottie) | Animações 2D empacotadas, com assets e estados. | Biblioteca curada opcional; não adotar um segundo runtime 2D sem caso real. Alegação de compressão do fabricante não foi reproduzida. |

### Modelos próprios, formatos e licença

- Preferir GLB 2.0 para importação. **GLB pode conter referências externas**: extensão `.glb` não comprova arquivo autocontido. [R27 especificação glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
- Validação estrutural: [R28 Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator). Validação não substitui limites de memória, tempo, referências externas e orçamento gráfico.
- Otimização: [R29 glTF Transform](https://gltf-transform.dev/) documenta deduplicação, simplificação e compressão. Escolher extensões e codecs em spike com suporte testado.
- [R25 Poly Haven](https://polyhaven.com/license) declara CC0 para seus assets. É candidato para uma biblioteca curada com registro de origem. Isso não transforma todo acervo da web em material livre.
- [R26 Sketchfab](https://sketchfab.com/developers/download-api) exige autenticação do usuário para download comum por API. Licenças variam; integração não deve baixar modelos indiscriminadamente. Não se assume autorização de redistribuição a partir de “download gratuito”.
- Manter manifesto por asset com autor, URL, licença, atribuição e data. Arquivos próprios exigem declaração de direitos e fluxo de denúncia. Licença comercial/editorial precisa ser verificada por arquivo; esta pesquisa não equivale a parecer jurídico.

### Conclusão técnica

A [documentação de otimização do Spline](https://docs.spline.design/exporting-your-scene/how-to-optimize-your-scene) também orienta limitar geometria, materiais, texturas e quantidade de cenas. Seu painel apresenta estimativas, não medições universais. Isso fundamenta medir a cena junto da página e manter um orçamento por experiência.

Oferecer cenas prontas editáveis **e** importação de GLB próprio, com controles de câmera, escala, luz, materiais e animação suportada. Não desenvolver um Blender dentro do painel. Cenas são decoração ou blocos complementares; links, texto e CTAs permanecem HTML acessível. Uma falha no 3D não impede o acesso ao conteúdo.

## 5. Animação, acessibilidade, mídia e desempenho

| Fonte | Evidência usada | Regra proposta |
| --- | --- | --- |
| [R30 MDN — WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | Limites de GPU variam; liberar recursos e lidar com perda de contexto. | Poster, pausa fora de visão e ao ocultar a aba; orçamento de cena; descarte ao desmontar. |
| [R31 MDN — reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) | Preferência do visitante pode reduzir movimento. | Substituir efeitos decorativos por composição estática; controle persistente de pausa na visita. |
| [R32 W3C — carrossel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/), [animações](https://www.w3.org/WAI/tutorials/carousels/animations/) | Exige controle previsível de rotação, foco e anúncio. | Manual por padrão; autoplay opcional com pausa, suspensão no foco e sem retorno automático após pausa explícita. |
| [R33 W3C — dragging](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | Arrastar precisa de alternativa por ponteiro simples, quando aplicável. | Subir/descer/mover para seção além de drag; suporte de teclado. |
| [R34 MDN — autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) | Autoplay depende das políticas do navegador; áudio é particularmente restrito. | Vídeo decorativo mudo, poster e fallback; vídeo de conteúdo iniciado pelo visitante. |
| [R35 web.dev — Web Vitals](https://web.dev/articles/vitals) | Referência atual de LCP 2,5 s, INP 200 ms, CLS 0,1 no percentil 75. | Metas de campo futuras; laboratório reprodutível antes da liberação. Não declarar conformidade de campo pelo Lighthouse. |
| [R36 OWASP — upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Validar conteúdo, tamanho, acesso e armazenamento. | Pipeline por tipo, assets privados até aprovação e publicação, sem confiar em MIME/extensão. |
| [R37 OWASP — SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) | Buscar URLs fornecidas abre riscos de rede e redirecionamento. | Importação por URL e extração de preview só por safe-fetch restrito; nenhuma busca de rede implícita dentro de um GLB. |
| [R38 Next 15 — lazy loading](https://github.com/vercel/next.js/blob/v15.1.11/docs/01-app/02-building-your-application/06-optimizing/07-lazy-loading.mdx) | Context7 confirmou carregamento de componente cliente; `ssr:false` não pertence ao Server Component. | HTML público continua renderizado no servidor; runtime de efeito em ilha cliente. |

Versão local observada: Next 15.5.26/React 19. Context7 não ofereceu exatamente 15.5.26; foi consultada 15.1.11. A orientação é da mesma versão principal, mas diferenças devem ser verificadas na versão instalada durante a execução. Não houve upgrade.

## 6. Confronto com o produto existente

| Área confirmada no código | Fonte local | Consequência |
| --- | --- | --- |
| Seis temas, aparência por enum e cor hexadecimal | `frontend/src/features/profiles/profile-appearance.ts`, `backend/src/domain/profiles/appearance.ts` | Ampliar contrato versionado; preservar páginas antigas. |
| Renderer compartilhado e coluna pública de até 600 px | `components/profile-view.tsx`, `components/personal-page.module.css` | Variantes reais de layout precisam alcançar todos os consumidores. |
| Blocos atuais TEXT/IMAGE/VIDEO, até 12, antes dos links | `domain/profiles/content-block.ts`, `profile-input.ts`, editor de blocos | Falta sequência única que intercale conteúdo e grupos. |
| Vídeo atual limitado a YouTube/Vimeo validados | `content-block.ts` em frontend/backend | Preservar click-to-load e ampliar por providers explícitos. |
| Imagem de perfil é otimizada pelo pipeline de avatar | `avatar-webp.ts`, `repositories/profile-media.ts` | Backend aceita PNG/WebP de até 512 px/256 KiB; seleção original pode ser maior antes da preparação cliente. Não serve como contrato de fundo ou vídeo. |
| Catálogo já tem mídia aprovada independente | `domain/links/link-media.ts`, `repositories/link-media.ts` | Reutilizar preparação e conceitos; não confundir propriedade de Link com mídia pessoal do ProfileItem. |
| Autosave com writer único, 700 ms e expectedVersion | `use-profile-draft.ts` | Preservar concorrência, flush e recuperação ao acrescentar undo/layout. |
| Histórico gratuito, 50 revisões/180 dias e publicação ativa preservada | `profile-plans.ts`, `profile-history.ts`, `profile-revisions.ts` | Não monetizar retroativamente nem perder referências de mídia. |
| Planos FREE/PRO/PREMIUM e cobertura paga canônica | `domain/billing/profile-plans.ts`, `profile-capability-coverage.ts` | Aparência base independe do provedor; não liberar capacidade pelo browser. |
| RichBlocks e subdomain não são permitidos no plano PRO atual | `validateProfilePlan` | A matriz nova não pode conceder esses recursos ao Pro silenciosamente. |
| Marca obrigatória e separação de destaque | `execucao-f11.md`, `AGENTS.md` | Não propor venda de remoção de marca ou exposição garantida. |
| Campanhas, mídia kit, busca e prévias usam o mesmo ProfileView | Consumidores em `features` | Testar compatibilidade em todas essas superfícies. |
| Exportação omite arquivos de imagem e usa schemaVersion 1 | `profile-export.ts`, `profile-backup.ts` | Nova versão deve explicitar mídia ausente, permissões e remapeamento de IDs. |

As referências locais estão relativas a `frontend/src/features/profiles`, `backend/src` ou `docs/planejamento-features`, conforme o caminho. São evidência de código lido, não de teste executado nesta pesquisa.

## 7. Monetização recomendada e custos

**Recomendação própria:** gratuito útil e visualmente profissional; Pro para composição e produção mais avançadas; Premium para recursos com processamento, armazenamento e operação maiores. Os 20 estilos básicos devem estar disponíveis no gratuito, com versões estáticas dos estilos de movimento. A seleção de estética não é motivo suficiente para bloquear um perfil básico.

Preservar integralmente recursos gratuitos atuais, marca em todos os planos e regras existentes de assinatura. Novos recursos avançados terão capacidades específicas; não reutilizar `profile.richBlocks` para criar uma transferência implícita de recursos Premium ao Pro. A spec apresenta a matriz completa como proposta, sem ativá-la.

Custos a medir: armazenamento de originais/derivados/histórico; tráfego por visita e cache; processamento de vídeo/modelo; moderação; observabilidade; fontes e assets; suporte e falhas. Fórmula de referência: custo mensal = armazenamento + entrega de bytes + processamento + moderação + suporte + fornecedores. Por usuário pago, acrescentar tributos/taxas do meio já contratado e margem definida pelo negócio. Sem dados de volume e fornecedor, não há base para preço ou promessa de “ilimitado”.

Não recomendar bloquear uma página por popularidade nem gerar cobrança automática de excedente. Ao atingir limite, preservar publicação e dados, restringir novas operações de alto custo e oferecer alternativa estática. A política exata de tráfego é uma decisão comercial posterior, com transparência e teste de abuso.

## 8. Limites desta pesquisa

Pesquisa ampla dirigida aos temas solicitados, não levantamento exaustivo de todo o mercado. Não foram testados editores pagos, exportações comerciais, serviços de vídeo, todos os aparelhos, leitores de tela ou custos reais. Algumas URLs falharam: Tate retornou 403; páginas específicas de Awwwards tiveram timeout; uma URL antiga de Webflow retornou 404; a página de recursos de solo.to não foi recuperada. Esses acessos não fundamentam funcionalidades na spec.

Nenhum código proprietário foi enviado a terceiros. Consultas técnicas usaram nomes públicos e perguntas genéricas. Não foram contratados serviços ou consumidos fornecedores de geração. Capturas de referência não são mockups aprovados nem assets licenciados para publicação.
