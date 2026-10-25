# Minha página — editor visual profissional

Data: 25/10/2026. Branch: `codex/roadmap-f37-testes`.
Estado: **SPEC PROPOSTA PARA REVISÃO; NÃO IMPLEMENTADA; NÃO APROVA VENDA OU DEPLOY**.
Pesquisa: [fontes, inspeções e limitações](2026-10-25-minha-pagina-pesquisa.md).
Complemento: [soluções prontas e integrações para agentes](2026-10-25-minha-pagina-bibliotecas-prontas.md).
Plano: [implementação por entregas](../plans/2026-10-25-minha-pagina-studio.md).

## 1. Autorização, objetivo e interpretação

O usuário solicitou pesquisa abrangente na internet, uso de Superpowers, criação da spec e depois do plano, sem escrever código. Delegou a definição fundamentada do escopo. Por isso os documentos são produzidos nesta sequência sem uma nova pausa entre eles; continuam propostas revisáveis. Não se presume aprovação de novas condições comerciais, despesas, dependências, infraestrutura ou implementação.

Objetivo: permitir que uma pessoa sem programação publique uma página bonita, profissional, própria e funcional, indo de um perfil simples a um portfólio ou apresentação rica, com layouts, imagens, cards, vídeo, animação e 3D. O nome de produto continua **Minha página**; “studio” nos nomes dos documentos identifica este programa, não renomeia a interface.

Públicos: comunidades, criadores, profissionais, pequenos negócios e eventos. O visitante precisa entender quem é o dono, encontrar conteúdo e acessar o destino desejado. O dono precisa criar, experimentar, comparar, publicar e recuperar seu trabalho sem perder dados.

Superfície do editor: Operate. Página publicada: Experience/Persuade conforme a atividade. O editor mantém a identidade Ondas; a publicação respeita a identidade do dono. Os 20 estilos coexistem e não serão substituídos por uma única direção estética.

“Personalização completa” significa controle profissional sobre conteúdo, composição, identidade, mídia e interações suportadas, com alternativas responsivas. Não significa execução de código arbitrário na origem da plataforma, ausência de limites de arquivo ou desenvolvimento de um editor de modelagem 3D completo. Esses limites preservam o funcionamento do produto e não impedem a exploração visual solicitada.

## 2. Abordagens e escolha do autor

| Abordagem | Vantagem | Limite e decisão |
| --- | --- | --- |
| Ampliar apenas presets de aparência | Pequena mudança no editor atual. | Não atende layouts, intercalar componentes ou cards ricos. Insuficiente para o pedido ampliado. |
| **Editor por seções, componentes e propriedades avançadas** | Grande liberdade com conteúdo semântico, responsividade e infraestrutura atuais. | Escolha proposta pelo autor sob delegação do usuário. Exige novo documento visual versionado e evolução por entregas. |
| Canvas vetorial irrestrito ou fork de construtor externo | Controle geométrico total. | Muito maior; difícil manter ordem de leitura, mobile, publicação, métricas e segurança. Não adotado neste programa. |

Não incorporar um page builder genérico nem substituir Next/React. Usar composição, controles existentes e variantes tipadas. Avaliar bibliotecas pontuais somente nos spikes previstos, com licença, peso e necessidade registrados antes de adoção.

### 2.1 Reuso seletivo fundamentado

A pesquisa complementar muda o caminho de execução: preferir Embla para carrosséis com gestos, Motion core para movimento DOM avançado, Paper Shaders para fundos procedurais e helpers Three/Fiber/Drei para cenas, quando seus spikes demonstrarem vantagem. São candidatos, não dependências adotadas. CSS/WAAPI, scroll-snap e componentes locais continuam suficientes para casos simples. Copiar um efeito Magic UI gratuito MIT pode poupar código; não importar seu design system, Tailwind ou provider global de tema.

MCPs de Motion/Spline/Paper e skills oficiais de Motion/Spline auxiliam consulta e autoria; não fazem parte do runtime publicado. Ferramentas opcionais não viram requisito para editar/visitar uma página. Modelos/texturas curados podem vir de Poly Haven/Kenney com licença por asset. React Bits, Animate UI e catálogos comerciais exigem confirmação do direito específico de uso em biblioteca editável; não presumir licença MIT irrestrita por terem código disponível.

Toda incorporação registra origem, versão/commit, licença/avisos, dependências transitivas, rede, manutenção e benchmark. Tema salvo guarda parâmetros próprios tipados, sem serializar objetos da biblioteca. A seleção não altera capacidades, cobrança ou pipeline de mídia.

## 3. Fundamentos que não podem regredir

- Publicação gratuita, destaque pago separado e elegibilidade confirmada pelo servidor; sem prometer audiência.
- Marca da plataforma permanece em todos os planos. Personalização não permite esconder marca, denúncia, consentimento ou identificação comercial aplicável.
- Editor gratuito atual, categorias, aparência e histórico continuam gratuitos; história atual de 50 revisões/180 dias não vira paywall.
- Sessão, canSubmit, suspensão, permissões de equipe, tenant e propriedade de mídia permanecem no servidor.
- Rascunho, revisão e publicação continuam distintos. Nova mídia ainda não aprovada não substitui a publicada.
- Preservar aprovação automática condicional e revisão humana existentes; não prometer análise exclusivamente humana.
- Consentimento e ausência de marketing antes do aceite; sem dados pessoais em eventos novos.
- Canonical, robots, sitemap, metadados e HTML público no servidor. Runtime visual não vira pré-requisito para ler ou clicar.
- Não instalar dependências, criar branches/commits, realizar push, contratar serviços ou fazer deploy nesta entrega documental.

## 4. Jornada do editor

### 4.1 Entrada e estrutura

Pessoa com página existente abre o editor atual e encontra seu conteúdo intacto. Pessoa nova escolhe “Começar com modelo” ou “Começar do zero”, reutilizando a entrada manual/assistida já existente. A escolha de atividade sugere conteúdo inicial; não restringe estilo, layout ou componentes. Não criar um segundo onboarding concorrente.

Estrutura proposta, preservando URLs atuais e adicionando ferramentas quando necessário:

1. **Conteúdo e estrutura:** árvore de seções, blocos e grupos, biblioteca e edição contextual.
2. **Aparência:** temas, cores, fundo, tipografia, botões/cards e decoração.
3. **Layout:** largura, colunas, distribuição, espaçamento e adaptações por dispositivo.
4. **Movimento:** presets e propriedades por alvo, prévia e pausa geral.
5. **Biblioteca:** imagens, vídeos, áudios, fontes autorizadas, modelos e componentes salvos.
6. **Publicação:** comparação, checklist, pendências e ação de publicar; reutilizar toolbar e fluxo existentes.

Desktop: árvore/biblioteca, prévia central e inspetor contextual, com painéis recolhíveis. Mobile: prévia e controles em modos alternáveis, evitando três colunas comprimidas. Seleção direta destaca o bloco também na árvore; editor visual não navega pelos links reais. Oferecer modo “Testar página” separado para navegação e formulários.

Ajustes rápidos e avançados editam o mesmo documento. Avançado revela grid, tipografia, materiais, transformações decorativas e animações, sem criar um segundo arquivo ou “modo sem segurança”.

### 4.2 Operações obrigatórias

- Adicionar, editar, duplicar, mover, ocultar, bloquear contra edição acidental e remover blocos/seções.
- Drag opcional; sempre oferecer subir/descer/mover para seção por clique e teclado.
- Duplicar conteúdo cria IDs novos; referências a links existentes permanecem explícitas. Não clonar tokens de acesso ou criar duplicação de campanha por efeito colateral.
- Undo/redo local até 100 operações nesta sessão, com coalescência de digitação e confirmação antes de perda por recarregamento/conflito. Não é colaboração em tempo real.
- Autosave mantém writer único e expectedVersion; sliders atualizam a prévia imediatamente e enviam estado consolidado. Não escrever no servidor a cada frame.
- Conflito entre abas não sobrescreve conteúdo; permitir copiar/exportar o rascunho local para recuperação antes de recarregar. Upload pendente não desaparece silenciosamente.
- Tema pode ser aplicado por inteiro ou só em fundo, tipografia, cards ou cores. Nunca muda conteúdo, destinos, visibilidade, agendamento ou permissões.
- Prévia desktop/tablet/mobile, zoom da área de edição, comparação com a versão publicada e validação de links essenciais.
- Restauração de revisão gera rascunho e exige a publicação normal; não publica por si.

### 4.3 Estados

Tratar primeira visita, vazio, carregamento, seleção, sem seleção, edição, salvando, salvo, erro, offline, conflito, upload, processamento, revisão, rejeição com motivo privado, componente indisponível e conta com acesso somente de leitura. Mostrar progresso de etapas reais sem inventar percentuais. Falha mantém o trabalho válido e fornece recuperação.

## 5. Conteúdo, componentes e layouts

### 5.1 Biblioteca completa deste programa

| ID | Componente | Comportamento de aceite |
| --- | --- | --- |
| B01 | Link/card | Compacto, thumbnail lateral, capa superior ou card grande; título e destino continuam canônicos. Imagem opcional com recorte/foco e fallback. |
| B02 | Grupo de links | Lista, grade, bento ou carrossel; referências aos itens existentes, sem copiar destino/preço/estado. |
| B03 | Texto e título | Texto formatado por AST permitido: parágrafos, títulos, negrito, itálico, listas e links seguros. Sem HTML bruto. |
| B04 | Imagem e figura | Upload, legenda, descrição, recorte não destrutivo, foco e link opcional validado. |
| B05 | Galeria | Grade responsiva e lightbox opcional com teclado, foco devolvido e descrições. |
| B06 | Carrossel | Imagens ou referências a cards; controle manual por padrão, swipe e botões. Regras de movimento da seção 8. |
| B07 | Vídeo | Preservar YouTube/Vimeo click-to-load; acrescentar vídeo próprio com poster, controles, legendas e alternativa. |
| B08 | Áudio | Arquivo próprio com controles e transcrição; embed musical aprovado como provider específico. Nunca autoplay sonoro. |
| B09 | Chamada/banner | Título, texto, mídia e ação real; sem selo/contagem/urgência fabricados. |
| B10 | FAQ/accordion | Título e respostas, sem esconder informação essencial; links e headings corretos. |
| B11 | Depoimentos | Dados informados pelo dono, com autorização de mídia e sem alegação de verificação automática. |
| B12 | Serviços/produtos | Vitrine com imagem, descrição e link externo. Valor opcional é informado, com moeda; não inicia checkout interno. |
| B13 | Separador/espaço/forma | Espaçamento limitado; decoração fora da árvore acessível e sem bloquear ações. |
| B14 | Redes e embeds | Ícones distintos por contexto conforme skill local; providers permitidos; placeholder antes de consentimento/interação quando aplicável. |
| B15 | Contato/evento/canais | Reutilizar funcionalidades existentes e suas permissões, horários, expiração e métricas. Não criar formulário ou evento paralelo. |
| B16 | Navegação e agenda visual | Âncoras de seção, índice opcional e countdown somente de data real de evento; sem contagem reiniciável enganosa. |
| B17 | Modelo 3D | Um objeto próprio/curado com poster, controles de câmera e descrição; falha não remove conteúdo textual. |
| B18 | Conteúdo por idioma | Traduzir texto/alt/legenda de blocos novos e preservar fallback e locale atuais. |

Esses componentes pertencem ao escopo completo, distribuídos no plano. Loja com pagamento interno, cursos, CRM novo e disparo de marketing não pertencem a este programa; vitrines, formulário, mídia kit e ferramentas já presentes devem se integrar ao que existe.

### 5.2 Layouts

Disponibilizar: coluna clássica, cards em grade, bento com spans, apresentação dividida, editorial com seções, portfólio/galeria e faixas de largura ampla. Layout e estilo são independentes. O dono pode misturar formatos entre seções.

Grid tem até 12 trilhas no desktop, 8 no tablet e 4 no mobile, com spans e gaps tipados. Colunas significativas colapsam conforme ordem de leitura; editor mostra essa ordem. Overrides por dispositivo cobrem spans, alinhamento, densidade e enquadramento, sem duplicar o conteúdo. Ocultar por dispositivo fica limitado a decoração; conteúdo e ações não desaparecem por engano no celular.

Sobreposição, rotação e posição livre são permitidas para decoração dentro da seção. Elementos funcionais permanecem no fluxo/grid. Sobreposição decorativa usa pointer-events none, recorte local e controles de profundidade; não cobre foco, formulário ou marca. Uma página pode ser visualmente livre sem usar posição absoluta em todos os links.

Limites estruturais iniciais de engenharia: 40 seções, 120 blocos visuais, profundidade máxima 3, até 20 slides por carrossel e 50 imagens por galeria; manter os limites existentes de 100 grupos e 500 links. São proteções propostas contra custo/complexidade, não alegações de plano ilimitado. Fixtures devem cobrir os limites e o primeiro valor inválido.

## 6. Os 20 estilos

Cada estilo inclui identidade completa, miniatura com conteúdo real, variação clara/escura quando apropriada, combinação de cards, comportamento mobile e alternativa estática. Os seis temas atuais continuam disponíveis como legados.

| ID estável | Direção proposta | Traço que a distingue |
| --- | --- | --- |
| minimalism | Composição contida | Hierarquia por espaço, alinhamento e proporção. |
| maximalism | Composição densa expressiva | Padrões, camadas e contraste de escala com zonas de leitura protegidas. |
| surreal | Onírico | Objetos/ilustrações e relações inesperadas de escala; conteúdo funcional estável. |
| swiss | Tipográfico geométrico | Grade, alinhamento e contraste de pesos; inspiração R18 da pesquisa. |
| y2k | Digital dos anos 2000 | Cromado, adesivos, formas infladas e acentos vivos. |
| editorial | Revista | Serifas/sans em papéis próprios, colunas e ritmo de leitura. |
| pixel-art | Digital em pixels | Contornos/padrões pixelados; corpo de texto legível. |
| clay | Volume macio | Formas arredondadas e sombras; controles reconhecíveis. |
| glass | Transparência | Vidro sobre fundo com contraste protegido e fallback opaco. |
| cyberpunk | Urbano tecnológico | Base escura, neon e detalhes técnicos sem piscadas. |
| pop-art | Gráfico | Cores chapadas, retícula e contornos; sem reproduzir obras. |
| retro | Anos 1970 como variante inicial | Tipografia expressiva, tons quentes e geometria de época; expansões nomeiam a década. |
| collage | Recortes | Papel, fotografias, texturas e camadas decorativas. |
| vector | Ilustração geométrica | Formas vetoriais curadas, áreas de cor e ícones coerentes. |
| futuristic | Precisão digital | Materiais luminosos e geometria limpa; distinto do ruído urbano de Cyberpunk. |
| handwritten | Autoral | Títulos manuscritos e traços; texto corrido usa fonte de leitura. |
| bohemian | Orgânico | Tons terrosos, fibras/texturas e motivos naturais. |
| graffiti | Urbano gestual | Lettering e tinta em títulos/decoração, sem prejudicar rótulos de ação. |
| aurora | Luz e cor | Mesh/degradês amplos, versão estática e movimento opcional. |
| victorian | Ornamental | Molduras, serifas e ornamentos próprios, com respiro de leitura. |

Essas traduções são escolhas propostas do autor; não uma taxonomia histórica certificada. Versionar tema, preservar overrides e registrar licença de fontes/assets. Carregar somente fontes usadas, com subconjunto latino incluindo português. Upload de fonte própria pode usar WOFF2 validado com declaração de licença no Premium; sem importação de CSS remoto.

## 7. Fundos, cards e biblioteca de mídia

Tipos de fundo: sólido; gradiente linear/radial/cônico de 2 a 6 cores; mesh de até 8 pontos; imagem; padrão/textura; vídeo; cena 3D. Combinar até quatro camadas entre base, mídia/cena, textura e overlay. Permitir cores, direção, posição, escala, enquadramento, transparência e desfoque delimitados. Cor sólida e poster acompanham fundos pesados.

Cards podem ter thumbnail, capa ou mídia destacada, borda, material, sombra, proporção, alinhamento e chamada. Texto permanece HTML, sem embutir o único rótulo da ação em imagem. Links de catálogo só reutilizam mídia pública aprovada; não puxar anexos pendentes. Mídia própria de card pessoal pertence ao perfil, sem alterar o Link do catálogo.

Biblioteca com origem, finalidade, peso, dimensões/duração, estado de processamento, revisão, onde é usada e motivo de rejeição. Oferecer substituir, reutilizar, recortar, remover do bloco e excluir quando sem referência. Remover uso não equivale a apagar arquivo ainda usado por publicação, revisão, campanha ou mídia kit.

### 7.1 Pipeline e limites técnicos propostos

| Tipo | Entrada máxima proposta | Derivado e regra de execução |
| --- | --- | --- |
| Imagem | JPEG/PNG/WebP, 10 MiB, 25 megapixels | Remover metadados, orientação correta, frame estático; variantes até 2560 px, thumbnails específicas e largura reservada. SVG de usuário não entra como markup; rasterizar em ambiente isolado ou rejeitar com orientação. |
| Vídeo decorativo | MP4/WebM, 50 MiB, 30 s | Sem áudio, até 720p/30 fps, poster obrigatório, derivado alvo até 8 MiB. Não usar se só o fallback passou. |
| Vídeo de conteúdo | MP4/WebM, 100 MiB, 5 min | Até 1080p/30 fps; controles, poster, faixa de legenda WebVTT validada e transcrição/alternativa. Vídeos maiores podem usar providers já suportados. |
| Áudio | MP3/M4A/OGG, 25 MiB, 30 min | Reencodificar para formato suportado e limitar derivado a 25 MiB; controles e transcrição. |
| Modelo 3D | GLB 2.0, 20 MiB | Derivado até 8 MiB, 100 mil triângulos, 60 draw calls estimadas, texturas até 2048 px; sem URI externa, script ou extensão não permitida. Poster obrigatório. |
| Fonte | WOFF2, 500 KiB por arquivo | Até duas famílias próprias por página; validar estrutura e licença declarada; fallback de sistema. |

MiB = 1.048.576 bytes. Limites são hipóteses de engenharia para spike, não valores medidos ou condições já vendidas. O spike pode alterá-los com evidência e atualização de spec/testes. Imagens/arquivos antigos continuam sob contratos anteriores; não rejeitar retroativamente publicação válida por limite novo.

Estados de processamento: UPLOADED, PROCESSING, READY, FAILED. Revisão separada: PENDING, APPROVED, REJECTED. READY não concede publicação. Upload e processamento são privados; bytes públicos exigem referência efetivamente publicada e mídia APPROVED. A classificação de uso decorativo não dispensa análise de conteúdo.

Processamento assíncrono com fila existente, limites de memória/tempo, idempotência e limpeza de temporários. Rejeição conserva a publicação anterior. Não executar transcodificação pesada em requisição web ou no browser como única validação.

Armazenamento proposto: metadados no PostgreSQL e originais/derivados em armazenamento durável compatível com S3, atrás de uma porta própria. Não colocar vídeos/modelos no pipeline de avatar ou disco efêmero. Seleção e custo do provedor são gate operacional antes da implementação dessa integração; testes usam adapter local determinístico, sem credenciais reais.

## 8. Animação e 3D

### 8.1 Movimento 2D

Presets: fade, reveal curto, stagger, zoom moderado, destaque ao hover/foco, paralaxe decorativa, flutuação, rotação lenta, gradiente animado e contorno luminoso. Controles: alvo, gatilho, duração, atraso, intensidade, easing predefinido e repetição. Sem campo para código JS ou CSS bruto.

Editor rápido mostra presets. Editor avançado permite até quatro ações por sequência e oito sequências por página. Gatilhos: entrada na área visível, ação explícita, hover em ponteiro apropriado e foco com resposta equivalente sem deslocamento obrigatório. UI do editor responde em 150–250 ms; animação de conteúdo pode durar 100–2000 ms; atraso até 2000 ms. Loops decorativos têm período mínimo 4 s e pausa acessível. Conteúdo não espera animação para ser clicável.

CSS/WAAPI primeiro. Motion core é a candidata para layout, entrada/saída e gestos que justifiquem um motor DOM; comparar carga seletiva e acessibilidade antes de adotar. Rive ou dotLottie só para assets que precisem desses formatos, selecionando um runtime de asset 2D em spike. Não confundir esse renderer com Motion DOM. Assets são curados; importação arbitrária desses formatos não faz parte da primeira versão do pipeline. Não instalar múltiplos motores por conveniência.

Fundos procedurais: Paper Shaders é candidato para mesh/aurora/retícula/ondas, com versão exata e licença/NOTICE preservados. Ajustar densidade de pixels e medir; defaults da demo não são orçamento aprovado. Shader parado ainda precisa de GPU, portanto não substitui poster/CSS de fallback. A biblioteca não concede upload de código shader.

Carrossel: manual por padrão. Autoplay opcional com intervalo mínimo 5 s, pausa visível, pausa no foco/hover, sem reinício após pausa explícita, sem mover o foco e sem anúncios contínuos por leitor de tela. Reduced-motion desativa autoplay, paralaxe, loops e movimento espacial; mantém conteúdo e feedback necessário. Sem JavaScript, mostrar lista/grade de slides acessível.

### 8.2 3D pronto e próprio

Biblioteca inicial proposta: formas clay, esferas metálicas, fitas/ondas, geometria wireframe, partículas suaves e palco de produto. Cada cena tem licença, poster, versão, orçamento e parâmetros permitidos. Cor, luz, câmera, rotação, velocidade, densidade e intensidade podem ser ajustadas dentro do orçamento.

Modelo próprio GLB entra por upload, validação/otimização, poster e revisão. Permitir escala, orientação, enquadramento, intensidade de iluminação e seleção de animação nativa aprovada. Não oferecer upload de `.blend`, FBX ou scripts; orientar exportação para GLB.

Usar um caminho 3D escolhido por spike: comparar Three.js direto e Three via React Three Fiber 9/Drei para React 19; model-viewer é alternativa se reduzir custo total sem limitar o escopo. Drei pode poupar carregamento/enquadramento/câmera/ambiente/flutuação, sem importar helpers indiscriminadamente. Ambientes e assets de exemplos precisam de licença própria e hospedagem aprovada. Spline/Blender são autoria opcional separada; sua contratação/conexão não é dependência para cenas próprias.

Um canvas GPU ativo por página, compartilhando orçamento entre shader de fundo e objeto 3D, alvo de 30 fps e DPR máximo 1,5 como ponto de partida. Blocos extras mostram posters; ativar um suspende/libera o anterior e usa poster do fundo. Previews do catálogo usam thumbnails. Decorativo não captura ponteiro; objeto interativo preserva rolagem vertical e teclado. Pausar quando oculto ou fora da área visível. Reduced-motion, falha de contexto, bloqueio ou economia de dados onde detectável usam poster; nunca depender de inferir a potência do aparelho.

Eliminar download do runtime em páginas sem efeitos correspondentes. Publicação sem JS conserva texto, links e poster. Runtime e decoders devem ser hospedados sob política aprovada; não assumir que dependências deixam de buscar CDNs por estarem instaladas.

## 9. Dados, contratos e compatibilidade

### 9.1 Documento canônico

Acrescentar opcionalmente `pageDocument` ao ProfileContent. Versão 2 contém `schemaVersion:2`, `design`, `sections` e referências de mídia. IDs de seção/bloco são UUID; temas/cenas usam IDs de catálogo e versão. `items`, `categories`, identidade, destinos, eventos e canais continuam canônicos no perfil atual; blocos LINK/GROUP guardam referências, nunca cópias desses registros.

`design` contém tema/versionamento, overrides, fundo em união discriminada, tipografia, materiais e movimento. `sections` têm layout, estilos locais e blocos tipados. Não aceitar chave desconhecida, URL arbitrária de shader, expressão CSS, HTML ou objeto serializado de biblioteca.

Sem pageDocument, renderer e APIs preservam o legado. Primeira edição v2 gera documento equivalente com o mesmo conteúdo e ordem: cabeçalho, contentBlocks, principal, grupos e contato. Migração é feita por ação explícita de edição/salvamento do editor atualizado, com expectedVersion e preview antes de publicar; não regrava todas as contas na leitura.

Após migração, pageDocument é a fonte visual única. `appearance` e `contentBlocks` antigos deixam de ser editáveis/graváveis para esse documento e são omitidos do novo conteúdo canônico; projeções legadas, quando necessárias, são derivadas. PATCH de cliente antigo que remover pageDocument de rascunho v2 é rejeitado como conflito de formato, não como pedido de apagar a composição. Restaurar revisão v1 continua possível como ação explícita e cria rascunho equivalente. Nenhuma conversão destrutiva automática no rollback.

Alterações de ordem/layout/cores não refazem análise textual como se fossem novos destinos. Mudança de texto, arquivo, imagem, vídeo, áudio ou modelo entra na política de conteúdo adequada. A atual função de snapshot de moderação precisa incluir o conteúdo textual e as referências visuais v2, sem classificar todo ajuste de estilo como alteração textual.

### 9.2 Mídia, retenção e acesso

Novo registro de mídia visual contém tenantId, ownerId, profileId, finalidade, checksum, tipo, tamanho, estado de processamento/revisão, derivados, poster, origem/licença e revisão. Consultas e downloads verificam vínculo e capacidade no servidor; conhecer o hash não concede leitura.

Manter referências de assets em rascunho, publicação, revisões retidas, campanhas e mídia kit. Coleta de lixo marca órfãos e aguarda 24 horas antes de apagar; revalida referências no momento da exclusão. Job repetido não remove asset que voltou a ser usado. Remoção da conta usa o fluxo de exclusão atual, sem inventar nova retenção de dados pessoais.

Não usar URL temporária assinada no conteúdo publicado. Guardar IDs e resolver caminhos estáveis, com política de cache/ACL compatível com suspensão, remoção e aprovação. Não servir objetos aprovados diretamente por chave de bucket sem verificar publicação. URL assinada privada tem TTL curto e nunca entra em analytics, exportação ou DOM público.

### 9.3 APIs propostas, sem substituir contratos existentes

- PATCH de perfil existente recebe pageDocument e expectedVersion; sessão/CSRF/BFF/tenant atuais.
- `GET /api/v1/me/profile/design-catalog`: temas, cenas, providers, componentes e limites efetivamente disponíveis, com estado de entrega e capacidade necessária.
- `POST /api/v1/me/profile/visual-assets`: inicia upload com purpose, filename, contentType, byteLength e checksum. Retorna assetId e upload privado autorizado; não retorna permissão pública.
- `POST /api/v1/me/profile/visual-assets/:id/complete`: valida arquivo persistido e agenda processamento idempotente.
- `GET/DELETE /api/v1/me/profile/visual-assets/:id`: consulta privada e exclusão somente sem referência ou remoção lógica explícita.
- `GET /api/v1/profiles/:slug/visual-assets/:id/:variant`: somente mídia publicada aprovada; range para áudio/vídeo com limites, cache e revogação definidos no adapter.
- Templates pessoais/componentes salvos: operações privadas no mesmo escopo de Profile; dados estruturados sem credenciais. Endpoints finais constam do plano.

`GET` de catálogo informa disponibilidade e bloqueio com texto; cliente não calcula preço. Conflito mantém semântica 409; propriedade alheia permanece 404 quando o contrato local evita enumeração. Validar limite antes de enviar bytes e novamente ao concluir. Upload direto não contorna autorização ou quota.

### 9.4 Integrações existentes

Busca, paginação e agendamento podem retornar subconjunto dos itens. Referência ausente na página carregada não é automaticamente inválida: resolver por grupos/itens existentes no servidor e manter a paginação atual. Não carregar 500 links para simular ordenação global no browser.

Campanhas congelam a composição da revisão de origem segundo sua regra atual; mídia kit preserva sua projeção e suas permissões. Exportação v2 contém documento e manifesto de arquivos omitidos. Importação remapeia IDs, não confia em ownership, preserva slug atual e usa placeholders explícitos para mídia a reenviar. Exportar não inclui arquivos, tokens, billing ou contatos por padrão. Leitor v2 aceita backups v1.

## 10. Planos: proposta comercial sem ativação

Princípio: gratuito entrega uma página bonita; Pro vende produtividade e composição avançadas; Premium vende mídia pesada e experiências especiais. Os benefícios novos não alteram assinaturas/PlanVersion existentes automaticamente. Recursos atuais preservam capacidades e condições vigentes até decisão comercial explícita.

| Recurso novo ou preservado | Gratuito | Pro proposto | Premium proposto |
| --- | --- | --- | --- |
| Editor, cores, botões, seis temas atuais e histórico atual | Preservar | Preservar | Preservar |
| 20 estilos básicos e alternativas estáticas | Sim | Sim | Sim |
| Fundo de imagem, thumbnails dos links, gradiente linear de 2 cores | Sim, quota inicial | Mais biblioteca | Mais biblioteca |
| Coluna e grade simples, conteúdo atual | Sim | Sim | Sim |
| Mesh, camadas avançadas e variações adicionais dos temas | Prévia privada | Publicar | Publicar |
| Split/editorial/bento avançado e overrides por dispositivo | Prévia privada | Publicar | Publicar |
| Galeria e carrossel como componentes novos | Prévia privada | Publicar | Publicar |
| Presets básicos de hover/foco e movimento reduzido | Sim | Sim | Sim |
| Sequências, paralaxe, biblioteca de animações | Prévia privada | Publicar | Publicar |
| Meus temas, componentes salvos e kit de marca | Não | Sim | Sim |
| Novos blocos avançados FAQ, vitrine, depoimentos e áudio embed | Prévia privada | Publicar | Publicar |
| Vídeo próprio, áudio próprio, vídeo de fundo e modelos GLB | Prévia estática de exemplo | Prévia estática de exemplo | Publicar após aprovação |
| Cenas 3D interativas e fonte própria | Prévia estática de exemplo | Prévia estática de exemplo | Publicar |
| Analytics e agendamento existentes | Condição atual | Condição atual | Condição atual |
| RichBlocks e subdomain existentes | Condição atual | **Não mover de nível implicitamente** | Condição atual |
| Marca, acessibilidade, consentimento, segurança e recuperação | Sempre | Sempre | Sempre |

Para evitar duas políticas para o mesmo conteúdo, os atuais TEXT/IMAGE/VIDEO do legado continuam sob `profile.richBlocks`. Novos componentes Pro são novos tipos/capacidades; não podem ser usados como atalho para converter ou publicar um bloco legado pago sem cobertura. Se a direção comercial preferir simplificar e mover richBlocks para Pro, isso exige decisão e migração de PlanVersion separadas, fora da ativação automática deste plano.

### 10.1 Mapeamento exato dos componentes

Esta tabela resolve a capacidade por semântica, inclusive após migração/importação. “Base” significa as capacidades gratuitas atuais, incluindo a ampliação proposta de thumbnail/fundo. Todas as capacidades indicadas com “+” são necessárias; variantes alternativas usam a regra da própria variante. A etapa em que a capacidade é exigida está definida em 10.2. Apenas remover conteúdo preservado não exige comprar a capacidade de criação.

| Tipo | Capacidade da variante, aplicada conforme 10.2 |
| --- | --- |
| B01 link/card | Base; thumbnail/capa estática incluída. Material avançado exige também `profile.designAdvanced`. |
| B02 grupo | Base em lista/grade simples; bento/split/editorial exige `profile.layoutAdvanced`; carrossel exige `profile.visualCollections`. |
| B03 texto formatado | `profile.richBlocks`, incluindo o equivalente v2 de TEXT. Títulos de seção sem corpo usam base e não são este tipo. |
| B04 imagem/figura independente | `profile.richBlocks`, incluindo equivalente v2 de IMAGE. Thumbnail de link e fundo pertencem a B01/design, não B04. |
| B05/B06 galeria/carrossel | `profile.visualCollections`; conteúdo restrito a imagens de coleção ou referências de cards. Não aceita um B03/B04/VIDEO arbitrário como slide para contornar sua capacidade. |
| B07 vídeo | YouTube/Vimeo exige `profile.richBlocks`; arquivo próprio exige `profile.richBlocks` + `profile.videoUpload`. |
| B08 áudio | Embed aprovado exige `profile.visualComponents`; arquivo próprio exige `profile.audioUpload`. |
| B09 CTA/banner | `profile.visualComponents`; título até 100, descrição até 300 caracteres, ação com destino obrigatório e thumbnail opcional. Não aceita corpo editorial, AST ou vídeo. |
| B10 FAQ | `profile.visualComponents`; até 20 perguntas, cada título até 100 e resposta de texto simples até 1000 caracteres. |
| B11 depoimentos | `profile.visualComponents`; até 20 entradas, nome até 100 e relato até 1000 caracteres, retrato opcional. |
| B12 vitrine | `profile.visualComponents`; até 50 entradas, título até 100, descrição simples até 500, moeda/valor opcionais e link obrigatório. Não é bloco de texto livre nem checkout. |
| B13 decoração/separador | Base em presets estáticos; transformações/camadas avançadas exigem `profile.designAdvanced`. |
| B14 redes/embed | Links sociais atuais usam base. Provider novo de conteúdo exige `profile.visualComponents`, além de `profile.richBlocks` quando for o player de B07. |
| B15 contato/evento/canais | Requer as mesmas capacidades e permissões do descriptor atual; este programa não lhes atribui nova tier. |
| B16 âncoras/countdown | Âncoras básicas usam base; countdown vinculado a evento exige `profile.visualComponents` e permissão de uso do evento existente. |
| B17 objeto/cena 3D | `profile.scene3d`; fundo 3D usa a mesma capacidade. |
| B18 idiomas | Regras atuais de idiomas mais as capacidades do bloco traduzido; tradução não transforma tipo pago em gratuito. |

A oferta Pro de coleções/FAQ/vitrine é uma decisão comercial nova e explícita; não muda o direito a editar os blocos editoriais legados. A política usa o tipo e a variante validados, nunca uma alegação de `origin` enviada pelo cliente. Converter TEXT/IMAGE/VIDEO para v2 preserva sua semântica/capacidade. Catálogo, publicação e projeção usam esta tabela; salvar/restaurar/importar também observam as distinções de etapa abaixo.

### 10.2 Rascunho, prévia, operação e publicação

| Ação | Regra proposta |
| --- | --- |
| Criar/salvar configuração de recurso novo leve sem plano | Permitido no rascunho privado: layout, tema avançado, galeria/carrossel, FAQ, CTA, vitrine e sequências. Validar schema, limites, referências e autoria normalmente. Autosave não falha por ausência de capacidade de publicação. |
| Prévia desses recursos leves | Permitida, privada e identificada como não publicada; nenhum checkout automático. Publicação informa precisamente quais recursos exigem cobertura. |
| Criar/alterar conteúdo TEXT/IMAGE/VIDEO legado ou seu equivalente v2 B03/B04/B07 | Preservar a exigência atual de `profile.richBlocks` no salvamento de conteúdo novo/alterado e na publicação correspondente. Migração estrutural sem alterar conteúdo, conservação e remoção não concedem nem exigem uma nova compra. Sem cobertura, mostrar exemplos privados em vez de fingir que esse conteúdo foi salvo. |
| Configurar 3D/vídeo de fundo/áudio ou vídeo próprio sem cobertura | Pode guardar escolhas e parâmetros no rascunho; prévia de catálogo é estática. Não pode iniciar novo upload/processamento pesado, executar motor restrito ou publicar. Upload próprio exige sua capacidade operacional de 10.1, além de quota/ACL. |
| Recuperar arquivo próprio após expiração | Dono autorizado pode baixar/excluir original e consultar estado por acesso privado de recuperação, sem novo processamento e sem exposição pública. Permissão de equipe é verificada; assinatura não substitui propriedade. |
| Salvar kit de marca/componente reutilizável | Persistência da biblioteca pessoal exige `profile.brandKit`. Rascunho experimental de uma página não cria um preset pago automaticamente. |
| Publicar ou executar recurso pago | Revalidar capacidade, entrega e mídia no servidor. Não apagar o rascunho quando houver bloqueio. Manter publicação anterior ou publicar alternativa compatível somente após confirmação. |
| Restaurar/importar documento avançado | Configurações novas podem retornar ao rascunho privado; não iniciam upload/processamento e não concedem publicação. As regras atuais de richBlocks preservados e remoção continuam aplicáveis, sem usar importação para criar conteúdo pago novo. |

Assim, capacidade de **publicar** não é confundida com permissão de **salvar uma experiência visual privada**. A API deve devolver essas ações separadas no catálogo/política. Quando um documento já preservado contém mídia pesada vencida, sua edição visual não inicia trabalho de processamento implicitamente.

Capacidades propostas, a validar como enum no servidor: `profile.designAdvanced`, `profile.layoutAdvanced`, `profile.visualCollections`, `profile.motionAdvanced`, `profile.brandKit`, `profile.visualComponents`, `profile.videoUpload`, `profile.audioUpload`, `profile.backgroundVideo`, `profile.scene3d`, `profile.customFonts`. Gratuito usa as capacidades base existentes, ampliadas deliberadamente para os novos estilos básicos/imagem/thumbnail, sem depender do provedor.

Quotas novas iniciais para modelagem de custo: 50 MiB/500 MiB/2 GiB de armazenamento por proprietário e tenant em Free/Pro/Premium, contando originais, derivados e histórico retido. Referência reutilizada não duplica bytes físicos. Não aplicar bloqueio retroativo ao acervo antigo nem usar essas quotas antes de medir/migrar o uso e aprovar os números. Excesso bloqueia novos uploads, nunca apaga publicação. Tráfego não gera cobrança automática; preço e franquia de entrega permanecem decisões de lançamento, com estudo de custo exigido no plano.

Prévia de recurso pago não altera a página pública nem inicia assinatura. Ao publicar sem capacidade: mostrar quais mudanças dependem do plano, permitir manter rascunho ou gerar uma versão compatível após confirmação. Não remover blocos silenciosamente.

Ao expirar cobertura paga, o público usa projeção compatível: poster para 3D/vídeo decorativo, grid/lista para layout/carrossel, fonte de sistema e estilos básicos. Mídia e documento são preservados para recuperação segundo a política de retenção aprovada; nenhum arquivo é apagado por inadimplência. Recursos pagos de conteúdo indisponíveis não vazam bytes; mostrar somente alternativa textual/poster explicitamente autorizada como pública. Restaurar/duplicar/importar não recupera capacidade vencida.

A projeção compatível é decisão proposta e precisa de aprovação comercial antes de execução; não muda o comportamento de expiração das capacidades antigas. Compra de destaque continua independente. Vendas de novas capacidades só quando entregue, validado, configurado e comercialmente aprovado no servidor.

## 11. Qualidade, segurança e observação

- WCAG 2.2 AA como alvo: teclado, foco, zoom 200%, reflow em 320 px, contraste, landmarks, ordem de leitura e alternativas. Foco/contraste/pausa nunca são pagos.
- Não prometer contraste automático de qualquer imagem. Proteger texto com superfície/overlay e avaliar as regiões reais; oferecer modo de leitura com fundo opaco sem alterar o conteúdo do dono.
- Sem scroll hijacking, cursor obrigatório, flashes ou conteúdo essencial apenas no hover. Reduced-transparency e forced-colors devem ter alternativa.
- Imagens informativas exigem alt; decorativas são marcadas. Vídeos com conteúdo falado exigem legenda/transcrição adequada ao caso; falha de autoplay usa poster e controle de reprodução.
- URLs/providers em allowlist; safe-fetch para previews/importação, com limites e redirecionamentos seguros. Nenhum iframe/JS/HTML arbitrário.
- Mídia nova exige revisão própria, denúncia e retirada; suspensão do dono bloqueia edição/publicação conforme regras atuais e revoga entrega pública quando aplicável.
- Metas de campo: p75 LCP <= 2,5 s, INP <= 200 ms, CLS <= 0,1. Medir com consentimento e política atuais, sem introduzir marketing ou PII.
- Gate de laboratório: página estática sem runtime 3D/2D não usado; mídia abaixo da dobra lazy; poster e dimensões reservadas; comparar mesmo dispositivo/rede/browser antes/depois. A tela simples não pode herdar o peso da tela experimental.
- Cenários de aparelho físico Android intermediário e Safari/iPhone antes de liberar 3D/vídeo como prontos. Emulação não substitui esse gate.
- Eventos novos minimizados: theme_previewed, theme_applied, block_added, asset_processing_failed, publish_blocked, visual_fallback_used, com IDs de catálogo/tipo e códigos. Sem título, descrição, URL de mídia, nome, e-mail, conteúdo ou asset privado.

## 12. Critérios de aceitação e rastreabilidade

Todos começam em **NÃO EXECUTADO**. O plano usa os IDs abaixo. U = domínio, PG = persistência/HTTP real, C = componente, E = E2E, V = inspeção visual/manual, O = operação.

| ID | Obrigação observável | Prova primária |
| --- | --- | --- |
| MP-01 | Perfil v1 mantém conteúdo, estilo, URLs e publicação; cliente antigo não apaga v2. | U/PG/E |
| MP-02 | Os 20 estilos são distintos e funcionam com conteúdo curto/longo em desktop/mobile. | U/V/E |
| MP-03 | Aplicar tema por camada preserva conteúdo e overrides não escolhidos. | U/C/E |
| MP-04 | Seções intercalam grupos, conteúdo e CTAs sem duplicar canônicos. | U/PG/E |
| MP-05 | Todos B01–B18 têm edição, público, vazio, erro e fallback aplicáveis. | C/E/V |
| MP-06 | Grid, bento, split e editorial preservam leitura e reflow; decoração não bloqueia ação. | C/E/V |
| MP-07 | Mover/duplicar/undo/redo funcionam por teclado e ponteiro; autosave não perde edição. | U/C/E |
| MP-08 | Upload inválido, alheio, excedido ou interrompido não vira mídia pública. | U/PG/E |
| MP-09 | Processamento/revisão são separados; substituição pendente conserva publicação anterior. | PG/E/O |
| MP-10 | Retenção protege referências em todas as superfícies e exclui órfão com revalidação. | PG/O |
| MP-11 | Imagens em cards e fundos têm variantes, foco e fallback sem esconder destino. | C/E/V |
| MP-12 | Vídeo/áudio próprios funcionam com range, poster, controles e alternativas. | PG/E/V/O |
| MP-13 | Movimento tem limites, pausa e reduced-motion; carrossel não rouba foco ou duplica métricas. | U/C/E/V |
| MP-14 | Cenas prontas e GLB próprio passam pipeline, orçamento e revisão; falha GPU mostra poster. | U/PG/E/V/O |
| MP-15 | Sem efeito não há download de motor; sem JS o conteúdo público continua utilizável. | E/O |
| MP-16 | FREE/PRO/PREMIUM são decididos por cobertura real, não por cookies/cliente. | U/PG/E |
| MP-17 | Expiração/downgrade/recurso não entregue preservam dados e usam projeção autorizada. | U/PG/E |
| MP-18 | Marca, consentimento, idade, moderação, tenant e destaque não regridem. | PG/E/V |
| MP-19 | Campanhas, mídia kit, busca, idiomas e templates mantêm seus contratos. | PG/C/E |
| MP-20 | Exportação/importação/restauração v1/v2 preservam referências válidas e não importam ACL/segredos. | U/PG/E |
| MP-21 | Componentes salvos e kit de marca pertencem ao dono/tenant e não alteram instâncias silenciosamente. | PG/C/E |
| MP-22 | SEO/SSR preservados, rede lenta e bloqueio de terceiro mantêm conteúdo. | E/O |
| MP-23 | Biblioteca tem licença/origem, uso e estado; revisão/denúncia/removal são operáveis. | PG/E/O |
| MP-24 | Qualidade visual/teclado/zoom/contraste e desempenho possuem evidência, não só screenshot gerada. | V/E/O |
| MP-25 | Nova oferta só é vendável após readiness e aprovação; nenhuma cobrança automática excedente. | U/PG/E/O |

MP-05 deve ser expandido em 18 linhas de evidência B01–B18 na execução; não aceitar “biblioteca pronta” quando um tipo existir só no editor. MP-02 precisa de 20 linhas por tema e tamanho principal. Matriz não implica teste já existente.

## 13. Entregas, decisões abertas e liberação

Ondas: fundação/compatibilidade; mídia segura e cards; 20 estilos/fundos; composição e componentes; movimento; mídia pesada/3D; integração comercial e operação. O programa só fica completo quando todas as ondas e MP-01–MP-25 passam. Lançamentos parciais mostram apenas o que está pronto; não vender o roadmap.

Decisões do autor registradas nesta spec: abordagem estruturada; 20 bases gratuitas; motor 3D único preferencialmente Three.js; GLB próprio; quotas e limites iniciais; proposta de capacidades; projeção compatível sem perda de dados. Não foram atribuídas ao usuário como decisões já aprovadas.

Gates antes da implementação correspondente: aprovação desta proposta; escolha/custo do armazenamento e transcodificação; revisão de dependências/licenças após spikes; aprovação da matriz comercial e dos limites; política de retenção de mídia paga preservada; volume e custo reais para preços e entrega. O plano especifica estudos com entregáveis, em vez de inventar orçamento ou condições de assinatura.

Não executar código deste programa enquanto esta entrega for apenas pesquisa/spec/plano. Não alterar planos antigos em massa nem marcar features anteriores como concluídas por existir esta spec. Arquivos de produto existentes e alterações locais de outras tarefas devem ser preservados.

## 14. Revisão da proposta

Builder check independente, conforme Superpowers brainstorming, realizado sobre esta spec. A revisão levantou duas lacunas materiais: capacidade por componente e distinção entre autoria privada e publicação. Foram resolvidas pelo autor sob a delegação de escopo, nas seções 10.1/10.2 e na tarefa 04 do plano. O revisor confirmou a resolução do último ponto em verificação restrita; não foi uma certificação geral da implementação nem execução de testes.

Pesquisa, spec e plano foram conferidos documentalmente. A aprovação do usuário e os gates operacionais/comerciais continuam explicitamente pendentes para execução. Não há código de aplicação implementado por esta tarefa.
