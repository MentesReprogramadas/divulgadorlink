# Registro de decisões pendentes

Status inicial de todas as decisões: **PENDENTE**. Responsável, data e evidência serão preenchidos quando a decisão for tomada. Não são perguntas bloqueando a criação da documentação: são gates antes das etapas de implementação dependentes.

Uma proposta dentro de spec não altera regra de produto aprovada. Sem decisão, não inventar preço, prazo de retenção, cobrança, SLA, método de verificação ou resultado estatístico. Se houver informação suficiente na implementação futura, registrar decisão fundamentada sem criar rodada de aprovação desnecessária; decisões de produto ainda não autorizadas exigem validação do responsável.

| Feature | Decisão e alternativas a fechar | Bloqueia |
| --- | --- | --- |
| F01 | D01 atribuição entre promoções sobrepostas e rateio do investimento por superfície; D02 cobertura e retenção. | F01-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F02 | D03 RESOLVIDA: 3 dias, uma vez por promoção/vencimento, e-mail opt-in desligado por padrão; painel independente. | 16/10/2026; [execução F02](execucao-f02.md) |
| F03 | D04 RESOLVIDA: seis por página, nicho+rede → nicho → rede, empates embaralhados por abertura com seed preservado no cursor (pedido posterior); RELATED analítica e sem posição paga nova. | 16/10/2026; [execução F03](execucao-f03.md) |
| F04 | D05 RESOLVIDA: múltiplas coleções privadas; nome 1–80, páginas de 20, sem quota comercial; posição/ID e troca Subir/Descer. | 16/10/2026; [execução F04](execucao-f04.md) |
| F05 | D06 RESOLVIDA: adesão explícita, semanal/30 dias, somente conteúdo geral, baseline e deduplicação por adesão; lote 30 dias e payload de retry limitado; token de cancelamento 256 bits/hash. Alternativas em execução. | 19/10/2026; [execução F05](execucao-f05.md) |
| F06 | D07 denúncia anônima ou autenticada, janela de deduplicação e retenção. | F06-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F07 | D08 RESOLVIDA: pausa do tempo pago e retomada após aprovação; 360 min, limiar 3, backoff 30/60 min e host 60 s. | Decisão do usuário em 15/10/2026; implementação e limites em [execução F07](execucao-f07.md) |
| F08 | D09 RESOLVIDA: consentimento obrigatório, mínimo de 10 buscas e retenção de 180 dias; excluir termos pessoais. Normalização conservadora e filtros por categorias efetivamente exibidas implementados; decisões/alternativas em [execução F08](execucao-f08.md). | F08-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F09 | D10 ATUALIZADA em 17/10: IA aprova ou encaminha para humano; recusa com motivo e uma contestação por versão. Substitui o bloqueio editorial sem revisão escolhido em 16/10. Slug por tenant; publicação separada; mídia normalizada e validada via porta PostgreSQL sem provedor novo. Limites e contratos na spec reconciliada. | Decisão do usuário em 16/10/2026; [spec F09](specs/f09-perfil-publico.md#reconciliação-de-execução-e-d10--16102026) e [execução F09](execucao-f09.md); concluída na branch; CI 38940575906 aprovado |
| F10 | D11 DNS/TLS wildcard e origens confiáveis; D12 inadimplência, cancelamento, reserva e redirecionamento de host. | F10-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F11 | D13 técnica registrada: BRL mensal, centavos/Price versionado configurável, Stripe Billing separado; sem preço inventado, venda desabilitada até preço/provedor/fiscal/capacidades reais. D12 assinatura: cancelamento/troca no fim do período, sem prorrata/trial nem extensão além do pago; conteúdo e marca preservados. Alternativas em [execução F11](execucao-f11.md). | S0–S6 validadas localmente; habilitação comercial e S7 ainda pendentes; política de host F10 continua própria |
| F12 | D14 ATUALIZADA em 17/10: liberação automática após validações ou revisão humana com recusa/contestação; erros de segurança/URL continuam exigindo correção. No-store/302, recuperação mediante nova validação e até 50 versões por 180 dias, preservando a publicação atual. | Respostas do usuário em 16/10/2026; [execução F12](execucao-f12.md) |
| F13 | D15 registrada: PNG/SVG; 256/512/1024 px, padrão 512; margem 4, correção M; qrcode atual, leitor de pixels só para QA pois BarcodeDetector está ausente. Ver [execução F13](execucao-f13.md); S0–S6 validadas localmente, S7 em revisão. | F13-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F14 | D16 registrada: [início,fim), UTC/fuso IANA, pausa prevalece; horários ambíguos/inexistentes rejeitados. Inventário e alternativas em [execução F14](execucao-f14.md); S0–S6 validadas localmente; S7 em revisão. | F14-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F15 | D17 RESOLVIDA: snapshot aprovado, destinos próprios copiados, catálogo vivo; nome privado e publicação independente; arquivo conserva relatórios. | 19/10/2026; [execução F15](execucao-f15.md) |
| F16 | D18 registrada: cinco modelos versionados em código; preservar conteúdo por padrão, confirmação para substituição e marcador protegido de exemplos ocultos. Catálogo gratuito com renderer/temas atuais, sem CMS/preço novo. [Decisões e alternativas](execucao-f16.md); S0–S6 validadas localmente; S7 em revisão. | F16-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F17 | D19: até 50 endereços, prévia privada de dez minutos, seleção revisada atômica, sem publicação nem busca de metadados. [Escolhas/alternativas](execucao-f17.md); S0–S6 validadas localmente, S7 em revisão. | F17-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F18 | D20 resolvida: mínimo 1, máximo 100 caracteres; lexical título/grupo, AND categoria, 20/página, cursor assinado vinculado à projeção/versão e reinício informado. Sem tracking novo. [Escolhas e alternativas](execucao-f18.md). | S0–S6 validadas localmente; S7 remoto em revisão; parada após F18 |
| F19 | D21 RESOLVIDA: até 50 versões por 180 dias, preservando a publicação atual. Usuário escolheu não guardar fotos antigas: restaurar sem foto quando removida, com aviso. | Respostas em 16–17/10/2026; implementação local em [execução F19](execucao-f19.md) |
| F20 | D22: papéis por recurso, convite de sete dias, revogação incluindo convites antigos; sem transferência de dono. Reuso do editor/renderer, scopes e limites F12 descritos na execução. | 19/10/2026; [execução](execucao-f20.md) |
| F21 | D23: apresentação aprovada, contato explícito vivo, métricas F01 com proveniência/cobertura e informado sem verificação. Gestão owner-only; renderer e prévia compartilhados. | 19/10/2026; [execução](execucao-f21.md) |
| F22 | D24 retenção, exclusão, campos permitidos, destinatários e opt-in de novidades. | Resolvida localmente em 19/10/2026; [escolhas e alternativas](execucao-f22.md); S7 remoto pendente |
| F23 | D25 round-robin ponderado, limites e fallback quando destino fica indisponível. | Resolvida localmente em 19/10/2026; [escolhas e alternativas](execucao-f23.md); S7 remoto pendente |
| F24 | D26 elegibilidade mínima, ranking, limites e conteúdo com restrição. | F24-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F25 | D27 provedor/modelo, orçamento, política de dados e validação de fatos; seleção externa antes de integrar. | Resolvida localmente em 19/10/2026; [escolhas e alternativas](execucao-f25.md); S7 remoto pendente |
| F26 | D28 objetivo, amostra, efeito mínimo, confiança, horizonte e consentimento. | F26-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F27 | D29 resolvida: snapshot IBGE Brasil/IANA; metadados nullable declarados, sem inferência; AND antes de rank/página; edição própria versionada e auditada. [Escolhas e alternativas](execucao-f27.md). | S0–S6 localmente verificadas; S7 global/CI/liberação em revisão |
| F28 | D30 métodos viáveis por rede, validade, revalidação e retenção da evidência. | F28-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F29 | D31 modelo de evento, política ICS para remarcação e inscrições externas. | F29-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F30 | D32 tipos de eventos, retry/backoff/retencão, rotação e política de saída de dados. | F30-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F31 | D33 resolvida: finalidade própria, opt-in do dono, dez sessões diárias, 180 dias e versões/viewports separados; [escolhas e alternativas](execucao-f31.md). | S0–S6 locais; S7 depende da REG-F03-001 e CI/liberação |
| F32 | D34 formatos, dimensões, fontes, limite de texto e mecanismo de render suportado. | F32-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F33 | D35 coleção pode incluir item indisponível como aviso sem destino, slug e tratamento de conteúdo restrito. | F33-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F34 | D36 RESOLVIDA: quatro obrigatórios derivados e três sugestões; prévia/cópia registram intenção, sem confirmar teste/entrega; publicação final F09. | 18/10/2026; [execução F34](execucao-f34.md) |
| F35 | D37 transições/reabertura, retenção e papéis que podem exportar/excluir. | F35-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F36 | D38 limites/preços, vínculo de cobrança, consentimento e procedimento de transferência. | F36-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F37 | D39 RESOLVIDA: oito canais, fontes F12 aprovadas, rede verificada, pausa a publicar, metadata F19, clique revalidado e medição F31 consentida. | 18/10/2026; [execução F37](execucao-f37.md) |
| F38 | D40 RESOLVIDA: exportação owner-only, allowlist de conteúdo/aparência, sem mídia/credenciais/cobrança/ACL; versões draft/published; sem restauração automática. | 19/10/2026; [execução F38](execucao-f38.md) |
| F39 | D41 idiomas, URL canônica, fallback e regras para destino por idioma. | F39-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F40 | D42 limiares, catálogo de regras, janela e validade de descarte. | F40-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F41 | D43 navegadores/dispositivos suportados, cache e política de atualização. | F41-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |

D01–D43 são identificadores de assuntos; uma linha pode citar decisões compartilhadas. D12, por exemplo, afeta cobrança e subdomínio. Fechar uma decisão exige atualizar todas as specs consumidoras referenciadas.

## Modelo de ADR

- ID do assunto e features afetadas.
- Problema e critério de aceitação que depende da decisão.
- Base existente examinada.
- Alternativas concretas, incluindo reaproveitar capacidade atual.
- Decisão, motivo e consequências para dados, UX, testes e rollback.
- Estado: proposta, aprovada, substituída; responsável, data e evidência.
- Arquivos/specs alterados e migração de contrato necessária.
- Plano de validar a hipótese e condição para rever a decisão.

## Fronteira da cobrança

F11 e F36 exigem decisão comercial. Se Stripe continuar como provedor de recorrência, usar Billing/Checkout subscription e eventos autenticados do ciclo de vida, sem laço manual de cobranças. A escolha do provedor e do desenho final ainda não foi feita; o adapter de cartão avulso atual não é integração recorrente pronta.

Tratamento tributário é decisão pendente: confirmar obrigações e registros aplicáveis antes de ativar coleta automática. Nenhuma configuração tributária foi alterada. Manter IDs/versão de plano e preço calculados no servidor; webhook, não retorno de página, determina ativação. Desenvolvimento em sandbox e reconciliação de eventos são gates obrigatórios.

Referência de desenho: [ciclo de assinaturas e webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [desenho de integração](https://docs.stripe.com/billing/subscriptions/design-an-integration). Diretrizes da habilidade stripe-best-practices foram usadas apenas para planejamento; não houve chamada de cobrança nem integração.

## F42 decisões prioritárias de integração

Atualização de 15 de outubro de 2026. Resolver estes assuntos antes de implementar F42; decisões D01–D43 de outras features não atrasam sua prioridade.

| ID | Decisão | Gate | Estado |
| --- | --- | --- | --- |
| D44 | Versão, base real, instância, conexão, autenticação verificável do webhook e contratos de mensagem, botões e participante | F42-S0/S3 | RESOLVIDA |
| D45 | Operadores vinculados a ADMIN ativo, identidade PN/LID, conta de bot dedicada e revogação | F42-S0/S3 | RESOLVIDA |
| D46 | Validade da referência, retenção, retry/backoff, entrega incerta, alertas opcionais e frequência | F42-S0/S2/S3 | RESOLVIDA |
| D47 | Serviço de decisão compartilhado, transação, efeitos e dispatch de propostas e contestações | F42-S0/S2 | RESOLVIDA |

As credenciais foram classificadas e configuradas somente no mecanismo de segredos da instalação, sem reprodução em arquivos. D44–D47 e o ensaio real estão documentados em [execução F42](execucao-f42.md). O usuário autorizou somente P0/F42; as decisões das demais features permanecem pendentes.



Atualização expressa de D10/D14: [Revisão de páginas e convites](../frontend-profissional/revisao-paginas-convites.md). Retenção, cobrança e isolamento não mudaram.

### D36 — execução F34

Resolvida em 18/10/2026: quatro obrigatórios derivados; três sugestões; marcos mínimos versionados em AuditLog; prévia/cópia não provam teste/entrega; GET puro e publish F09 final. Alternativas, reversão e testes em [execução F34](execucao-f34.md).

### D39 — execução F37

Metadata aditiva de itens e revisões F19; convites próprios F12; rede por knownHosts; limite composicional de oito; pausa no rascunho até publicar; escolha do visitante, sem prometer equivalência. Medição F31 sujeita ao plano e consentimento. Alternativas rejeitadas, indisponibilidade, token e reversão: [execução](execucao-f37.md).

## RF-2026-10-19 — Refinamento autorizado após F21

[Decisões e alternativas](refinamento-f05-f15-f20-f21-f38.md). F38 passa a importar JSON confirmado no rascunho; F05 marca recebimento no modal sem adesão silenciosa; Minha página usa destinos próprios; F15 prévia mantém modal; F20 tem equipe global e direitos por recurso, inclusive administração delegada por ADMIN sem mudança de cargo global; F21 usa o nome Apresentação para parceiros e dados/fontes objetivos. Regras anteriores de equipe limitada à página continuam válidas para convites legados. A equipe global não depende de uma página existir. Nova fonte de verdade deste delta registrada nas specs/planos; F22 não iniciada.

D24/D25/D27 concretizadas nesta sequência, conforme autorização para adotar a melhor escolha e documentar alternativas. A regra pública de moderação/publicação existente permanece; assistência não aprova catálogo. Parada após F25.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.


## 20/10/2026 — F39 e continuidade autorizada

F39 marcada no índice como validada sem implementação, testes ou execução correspondente. Corrigido para NÃO INICIADA, alinhado ao roadmap/matriz; permanece fora desta sequência. Nenhuma funcionalidade removida. Alternativa rejeitada: considerar uma linha isolada como evidência de entrega.

Autorização: salvar todas as alterações locais na branch atual e implementar F28, F29, F32, F33 e F10 com testes/docs/commits, parando após F10. Sem push/deploy implícito.

D30/F28: primeiro método é arquivo HTTPS no domínio do destino web aprovado de um convite F12. Escopo público: controle do domínio desse destino, sem identidade civil, endosso ou verificação de comunidade. Redes hospedadas sem mecanismo comprovado não são suportadas. Desafio aleatório de uso único por 30 minutos, somente hash persistido; validade da evidência 30 dias, retenção 180 dias. Revalidação exige novo desafio; novo destino/titular, desativação ou revogação invalidam o selo. Alternativas: DNS TXT (mais complexo para iniciante), código em descrição de rede (sem API comprovada), e-mail (não prova controle). Rotas propostas /me/links reconciliadas para /me/redirects/:id/ownership, recurso F12 real. Publicação de evidência em rota somente de leitura; sem tokens na projeção pública.


D31/F29 — 20/10/2026: evento é metadado tipado opcional de um ProfileItem URL, com título do item e destino HTTPS para inscrição/detalhes. Não duplicar signupUrl nem criar sistema de ingressos. Datas UTC, fuso IANA validado, local/transmissão, descrição e estado; visibilidade/agendamento F14 permanecem separados da data do evento. Evento encerrado/cancelado permanece informativo e retira o CTA de inscrição; não informa link morto ou presença confirmada. Rascunho/publicação/histórico/moderação/exportação existentes preservados; descrição e local também passam por moderação. Campo de remarcação calculado pelo servidor contra a publicação, sem confiar no valor do cliente.

ICS usa UTC, UID estável do item sem dados pessoais, SEQUENCE da revisão publicada, DTSTAMP do snapshot; cancelamento STATUS:CANCELLED com mesmo UID, arquivo derivado disponível para atualizar agenda manualmente. Não promete sincronização/push automático em calendários externos. Escapar texto e dobrar linhas em 75 octetos UTF-8. Referência: https://www.rfc-editor.org/rfc/rfc5545.html. Alternativas descartadas: ingresso interno; evento tratado como URL morta após término; novo editor de página; cron para cada evento; promessa de atualizar calendário baixado sem assinatura. Editor em três etapas reaproveita DatePicker/Select/FormSteps e conversão civilToUtc, com validação de horários inexistentes pelo fuso.

D34/F32 — 20/10/2026: geração no navegador com Canvas nativo e qrcode/F13 existentes, sem serviço de renderização, canvas/headless externo ou tabela. Dois formatos: post quadrado 1080×1080 e story vertical 1080×1920; modelos Minimalista e Cor em destaque. Fontes/cores do perfil por allowlist; logo local fixa. Texto editável até 80/500 caracteres, quebra por medição real e redução limitada de fonte; erro se não couber, sem corte silencioso. QR preto/branco com área de silêncio; decodificação do PNG final por jsQR independente.

Origem padrão: publicação, somente nome/descrição/aparência/endereço públicos; grupos ocultos, contatos e destinos privados não participam do plano da arte. Prévia do rascunho exige escolha explícita e recebe marca PRÉVIA — publique antes de divulgar. Imagem deve ser gerada e revista antes do download; editar invalida download da arte antiga. Revalidar versão/endereço/autorização antes de gerar e baixar. Personalização é local, sem alterar perfil. Sem upload de imagem arbitrária nem URLs de ativos recebidas de formulário. Alternativas rejeitadas: API nova duplicando leitura de perfil; gerar da versão mais recente sem distinguir rascunho; incluir foto/ativos privados automaticamente; instalar biblioteca de renderização. Permissão de leitura da página permite gerar/baixar material (não grava conteúdo), respeitando bloqueio da API e UI.
## D35 — F33 coleção pública (20/10/2026)

Publicação voluntária com snapshot de título/descrição/curador, ordem e identidades dos favoritos escolhidos; não copiar destinos nem transferir propriedade. Adições/edições privadas exigem republicação; remoção da coleção, desfavoritar ou perda de elegibilidade retiram o item na leitura. Item indisponível é omitido, em vez de revelar título/contagem privada. Curador informado explicitamente; anunciante identificado pelo papel (curador/outro anunciante/plataforma), sem divulgar nome ou e-mail privado do dono original.

Texto da curadoria passa pela mesma porta de moderação e limiar configurado; sinal suspeito/incerteza impede publicar e conserva os valores no editor. Alternativas avaliadas: publicar texto não analisado (recusado) ou criar uma fila humana própria para coleções (fora do contrato atual, que tipa PROFILE/REDIRECT; não fabricar IDs de perfil). Links continuam sujeitos à moderação humana do catálogo. Página inteira exige confirmação de idade quando a curadoria ou qualquer item elegível for restrito. Sem cache público para evitar leitura obsoleta após revogação.

Slug de 3–40 caracteres reutiliza a validação de perfil e fica permanente após primeira publicação. Reserva por tenant e chave interna aleatória sobrevive à exclusão, sem nome/e-mail; impede tomada de URL inclusive ao recriar o ID de coleção fornecido pelo cliente. Alternativa de liberar slug ao excluir foi recusada por risco de tomada de endereço. Collection recebe campos expansivos nullable/PRIVATE; dados antigos permanecem privados. GET público usa allowlist; snapshot privado nunca é retornado nele. Permissão granular favorites e confirmação de e-mail no servidor; auditoria usa colaborador real quando houver. Sem nova dependência ou preço.
## D11/D12 — F10 subdomínio da página (20/10/2026)

Raízes permitidas vêm de PROFILE_HOST_BASES, objeto JSON idêntico no frontend/backend, mapeando raiz controlada pela plataforma para host do tenant já cadastrado. Default vazio desabilita provisionamento e venda dessa capacidade; domínio próprio do cliente continua fora do escopo. Apenas um nível ASCII, 3–40 caracteres, nomes operacionais reservados; aliases de tenant e hosts existentes não podem ser tomados. Nenhum wildcard resolve tenant: o resolver consulta endereço exato, relação composta de perfil/tenant/dono, publicação, conta e cobertura paga real da F11.

Reserva PENDING não publica. Verificar HTTPS usa SafeFetch já existente com DNS fixado, bloqueio de IP privado, SNI/certificado válidos, timeout e rejeição de redirecionamento; exige prova exata do endpoint público da própria aplicação. Falha mantém reserva e endereço anterior. A plataforma deve apontar wildcard DNS/proxy e emitir certificado por seu processo operacional (DNS-01 quando certificado wildcard); a feature não altera Coolify/DNS nem instala certificado. Gate manual de staging permanece separado da fixture local. Referência: https://letsencrypt.org/docs/challenge-types/.

Edição, prévia, publicação, temas, blocos de links/serviços, eventos e formulário F22 continuam no editor/renderer existentes. Capa visual tipada usa cores do tema; não cria upload nem HTML/CSS arbitrários ou segundo editor premium. Alternativas de editor independente e novo provedor de página foram recusadas por duplicação. Endereço próprio depende de profile.subdomain entregue e cobertura paga; estilos gratuitos anteriores permanecem gratuitos.

Cancelamento de renovação mantém cobertura até fim efetivamente pago, conforme F11. PAST_DUE só conserva cobertura enquanto houver saldo válido; ao perder cobertura, host ativado redireciona temporariamente (307) para a página básica central /p/slug. Sem extensão de prazo nem preço inventado. Troca de nome reserva um novo host pendente e mantém o antigo ativo até HTTPS novo passar; o antigo fica RETIRED e encaminha para o básico, não é liberado para outro dono. Desativação explícita retorna indisponível (404). Reservas sem nome/e-mail sobrevivem à exclusão do perfil; sem tomada de URL. Alternativa de redirecionar para checkout ou liberar nomes no atraso foi recusada.

Host pessoal só serve publicação pública e APIs públicas da mesma página; login/painel/admin e outras páginas ficam bloqueados. Cookies de autenticação, papéis e workspace nunca são enviados pelo BFF dessa superfície. Cookies do painel continuam host-only, sem Domain pai; não usar X-Forwarded-Host recebido como autoridade. Referência: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie. Canonical do host aponta para sua raiz; /p/slug permanece disponível e privado para crawlers conforme política atual.

F10: contenção de abuso sem nova quota comercial: até cinco reservas de nomes e dez probes por perfil/hora, serializados e auditados. Nome já ativo/pendente não consome reserva adicional. Uma configuração sem raiz para o tenant também impede vender a capacidade naquele tenant, mesmo havendo raiz em outro. A composição E2E de prova HTTP local fica só no entrypoint descartável e não comprova certificado público.

F10: o ensaio real mostrou que fetch pode descartar Host. O resolver público global agora deriva tenant somente de hostname cadastrado + mapa de raízes no servidor; Host/X-Forwarded-Host do chamador não trocam o proprietário. Retorna apenas slug/host públicos, sem sessão, dono ou rascunho. A prova HTTP descartável usa transporte nativo para exercer Host real; o adapter de produção continua HTTPS com DNS fixado e SNI.

F10: após o probe externo, a transação revalida a permissão page.write e a conta confirmada do colaborador real; revogação em voo impede ativação tardia. A edição é serializada pelo dono, como as mudanças de equipe existentes. CTA de assinatura não aparece para colaborador sem billing.read. O ícone de criar página é distinto de criar link de catálogo.
