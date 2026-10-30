# Entrega Pets e publicação do descarte manual

## Produção confirmada

Correção publicada no SHA `d8374eeff01194ca14bd4e4d80c626c57949e998`, CI41080079096 concluído. API/web saudáveis; worker e bridge em execução, sem readiness de consumo. Smoke HTTP administrativo somente leitura confirmou185 produtos Pets:43 destacados e142 para revisão. Billy Dog MLB6839186178 retornou REVIEW/v2/sem decisão manual. Nenhum envio WhatsApp.

Configuração Shopee armazenada com criptografia por tenant na conta administrativa solicitada. Consulta real retornou20 produtos,17 com preço único, e gerador oficial confirmou shortlink HTTPS válido. Segredos e URL individual omitidos do relatório. Descrição de Pets salva na segmentação; aplicação no WhatsApp pendente.

## Implementação local pronta para revisão/publicação

- LP `/ofertas/pets`, marca e imagem próprias, CTA para convite existente, sem inventar prova social.
- Shopee: credenciais por tenant, conexão/desconexão/verificação, catálogo, fonte da coleta, prévia assinada e geração de links.
- Grupos: mensagens temporárias configuráveis, solicitação de entrada, fila persistente com espera mínima120s, cancelamento, leases e proteção contra aprovação duplicada/incerta. Descrição sincronizada uma vez por alteração. Novos grupos recebem política antes do convite quando habilitada.
- Extensão separada Evolution2.3.7: build completo/lint e16 cenários HTTP aprovados em checkout oficial isolado. Não instalada em produção.
- Vídeo original de24s em `output/pets-creative-v1/tem-link-aqui-pets-v1.mp4`, sem campanha publicada.

## Validação

Raiz executou lint/typecheck/build backend e133 testes aprovados/um já ignorado. Agentes executaram PostgreSQL, frontend e E2E conforme relatórios próprios:133 testes de afiliados frontend,66 dirigidos e6 E2E LP/configurações desktop/mobile. Capturas LP desktop e telas administrativas mobile também inspecionadas pela raiz. Vídeo decodificado integralmente;12 quadros reais inspecionados; player local reproduz/pausa/busca12s; sem audição humana. Graphify incremental:8794 nós/31660 relações. Diff check sem erro de whitespace.

## Pendências e limites

Novos recursos estão fora do commit publicado de descarte; autorização específica de publicação foi solicitada após entrega concreta. Principal01 continua em revisão: sem reconnect, restart, envio ou alteração de grupo real. Não afirmar mensagens temporárias/aprovação aplicadas enquanto conta/provider não confirmarem. Nenhuma campanha Pets ativada. Preservados consentimento, tenant, permissões e controles de envio.

RootLayout compartilhado mantém limitação sem JavaScript documentada pelo frontend. Referências, evidências e reversão específicas em relatórios de Shopee, política de grupos e pasta `docs/frontend-profissional/evidencias/pets-landing-2026-10-30`.
