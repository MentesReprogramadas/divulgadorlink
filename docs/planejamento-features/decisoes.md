# Registro de decisões pendentes

Status inicial de todas as decisões: **PENDENTE**. Responsável, data e evidência serão preenchidos quando a decisão for tomada. Não são perguntas bloqueando a criação da documentação: são gates antes das etapas de implementação dependentes.

Uma proposta dentro de spec não altera regra de produto aprovada. Sem decisão, não inventar preço, prazo de retenção, cobrança, SLA, método de verificação ou resultado estatístico. Se houver informação suficiente na implementação futura, registrar decisão fundamentada sem criar rodada de aprovação desnecessária; decisões de produto ainda não autorizadas exigem validação do responsável.

| Feature | Decisão e alternativas a fechar | Bloqueia |
| --- | --- | --- |
| F01 | D01 atribuição entre promoções sobrepostas e rateio do investimento por superfície; D02 cobertura e retenção. | F01-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F02 | D03 RESOLVIDA: 3 dias, uma vez por promoção/vencimento, e-mail opt-in desligado por padrão; painel independente. | 16/10/2026; [execução F02](execucao-f02.md) |
| F03 | D04 quantidade e ordenação inicial; iniciar por nicho/rede, sem exigir embeddings. | F03-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F04 | D05 permitir múltiplas coleções por favorito, limites e ordenação. | F04-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F05 | D06 frequência, consentimento, retenção do histórico de resumo e regras de conteúdo restrito. | F05-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F06 | D07 denúncia anônima ou autenticada, janela de deduplicação e retenção. | F06-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F07 | D08 RESOLVIDA: pausa do tempo pago e retomada após aprovação; 360 min, limiar 3, backoff 30/60 min e host 60 s. | Decisão do usuário em 15/10/2026; implementação e limites em [execução F07](execucao-f07.md) |
| F08 | D09 amostra mínima, normalização, retenção e escolha de consentimento para observações. | F08-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F09 | D10 unicidade de slug por tenant, regras de URL privada no perfil, mídia/limites e conteúdo restrito. | F09-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F10 | D11 DNS/TLS wildcard e origens confiáveis; D12 inadimplência, cancelamento, reserva e redirecionamento de host. | F10-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F11 | D13 preços, limites, periodicidade, prorrata, provedor e tratamento tributário; D12 grace/cancelamento. | F11-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F12 | D14 política de cache, recuperação e retenção de revisões/handles. | F12-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F13 | D15 formatos, tamanho e método de decodificação para teste; adicionar dependência só se inexistente e justificada. | F13-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F14 | D16 convenção de intervalo e comportamento de datas ambíguas em fuso. | F14-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F15 | D17 cópia versus referência dos destinos, URL e comportamento após arquivar. | F15-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F16 | D18 modelos iniciais, regras de preservação de conteúdo e limites de personalização. | F16-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F17 | D19 tamanho de lote, atomicidade ou sucesso parcial e expiração da prévia. | F17-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F18 | D20 tamanho mínimo de busca e paginação; começar lexical. | F18-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F19 | D21 retenção, máximo de versões e recuperação de mídia removida. | F19-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F20 | D22 matriz owner/editor/leitor, prazo de convite e transferência de dono. | F20-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F21 | D23 métricas permitidas, frequência de atualização e compartilhamento de contato. | F21-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F22 | D24 retenção, exclusão, campos permitidos, destinatários e opt-in de novidades. | F22-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F23 | D25 round-robin ponderado, limites e fallback quando destino fica indisponível. | F23-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F24 | D26 elegibilidade mínima, ranking, limites e conteúdo com restrição. | F24-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F25 | D27 provedor/modelo, orçamento, política de dados e validação de fatos; seleção externa antes de integrar. | F25-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F26 | D28 objetivo, amostra, efeito mínimo, confiança, horizonte e consentimento. | F26-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F27 | D29 origem do catálogo de localidades, semântica de ausentes e migração de metadados. | F27-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F28 | D30 métodos viáveis por rede, validade, revalidação e retenção da evidência. | F28-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F29 | D31 modelo de evento, política ICS para remarcação e inscrições externas. | F29-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F30 | D32 tipos de eventos, retry/backoff/retencão, rotação e política de saída de dados. | F30-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F31 | D33 taxonomia, sessão, consentimento, retenção e amostra para estatísticas de perfil. | F31-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F32 | D34 formatos, dimensões, fontes, limite de texto e mecanismo de render suportado. | F32-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F33 | D35 coleção pode incluir item indisponível como aviso sem destino, slug e tratamento de conteúdo restrito. | F33-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F34 | D36 passos iniciais e eventos de intenção versus compartilhamento confirmado. | F34-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F35 | D37 transições/reabertura, retenção e papéis que podem exportar/excluir. | F35-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F36 | D38 limites/preços, vínculo de cobrança, consentimento e procedimento de transferência. | F36-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F37 | D39 layout, limite de canais e semântica de indisponíveis. | F37-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
| F38 | D40 campos exportáveis, acesso de colaboradores e política de mídia. | F38-S0 e contratos dependentes em S2; autorização comercial antes de S7 quando aplicável |
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

