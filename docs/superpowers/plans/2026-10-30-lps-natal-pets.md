# LPs Natal/Pets e alinhamento de aquisição

## Contrato autorizado

LP Natal independente em natal.temlinkaqui.com, com estrutura, tipografia, CTAs, modal e movimento da LP Pets; conteúdo/cores/imagens/grupo próprios de Natal. Reutilizar arte original com marca T, sem logo do concorrente. Não acrescentar ocupação fictícia ou prova social. Pets conserva seu conteúdo já publicado.

Identificação de Natal somente na LP independente. /ofertas/participar/natal vira redirect HTTP307 para /ofertas/entrar/natal, sem renderizar formulário e sem mudar o resolvedor de convites. Os dois modais ficam compactos: título, WhatsApp, consentimento explícito desmarcado, botão; explicação e privacidade abaixo. Encurtar as frases para caber em320px sem truncamento; zoom/reflow preservados. Não enviar telefone/identificadores à Meta sem aceite; preservar DNT/GPC e destino validado.

## Execução e verificação

1. Adicionar origem natal.temlinkaqui.com à allowlist exata do BFF, com fixture HTTP que prova origem/UA/tenant e isolamento de credenciais/opt-out nos dois slugs.
2. Criar route handler estático para o redirect Natal. Transferir cobertura do formulário genérico para fixture Pets e provar307 de Natal em desktop/mobile. Lint/typecheck/build/E2E afetado e CI completo antes de produção.
3. Preparar LP Natal em C:/VSCODE/achadinhos-natal-lp via Sites; simplificar os modais de Natal e Pets. Testar imagens, CTAs, foco, teclado, erro, opt-out, DNT/GPC,320px, consentimento e URL inválida. Inspecionar capturas reais; sem novo participante ou conversão normal fictícia.
4. Publicar versões Sites salvas a partir das fontes pushadas. Anexar domínio Natal e alterar somente seus registros DNS necessários após versão pronta. Preservar instância/grupo/baselines e artefatos da hospedagem antiga para reversão.
5. Acrescentar origem Natal à configuração tenant sem revogar os cadastros existentes. Testar CORS/formulário no domínio público e rota antiga sem identificação.
6. Atualizar somente destino Natal no anúncio; comparar/alinha Meta de desempenho das campanhas ativas (website/LP views) e posicionamentos disponíveis, mantendo orçamentos atuais. Substitutas Leads qualificados continuam pausadas enquanto a meta estiver desabilitada na conta; não afirmar otimização por entrada antes da elegibilidade/primeiro ingresso real.

## Reversão

Republicar versão Sites anterior de Pets; restaurar DNS Natal anterior e destino anterior do anúncio se necessário. Desabilitar mensuração do tenant para interromper envios, sem apagar tabelas/consentimentos/auditoria nem reinicializar baselines. Nenhuma nova dependência ou framework.
