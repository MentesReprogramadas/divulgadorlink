# Contas e sessões do Mercado Livre

Pedido adicional após concluir a jornada guiada: configurar, trocar e desconectar a conta/sessão do ML e gerar links a partir do endereço do produto.

A jornada anterior passou em 4 integrações após o catálogo em lote. A inspeção local de Natal consultou 20 produtos em 10,9s, com um anúncio retornado. Não criar contas/grupos nem enviar mensagens reais nesta etapa.

## Decisões e alcance

- Reutilizar OAuth existente para a conta de catálogo. Configuração própria tem prioridade sobre a origem central; desconexão não retorna silenciosamente à origem.
- Reutilizar o protocolo de sessão do VHG: Cookie e token CSRF do gerador oficial, cifrados por tenant no servidor, sem expor novamente. A configuração avançada deve explicar a obtenção na própria conta. OAuth de catálogo não concede autorização ao gerador de afiliados.
- Sessão própria inclui identificação do perfil e etiqueta esperados e nome da conta; gerar somente resposta autenticada com anúncio e atribuição confirmados. Desconectar apaga os segredos e mantém marcador para impedir fallback central. Histórico/ofertas existentes preservados.
- Entrada por URL gera link sem inventar título/preço. Preparar oferta exige preencher/conferir os campos restantes. Produtos e vendas continuam sujeitos às regras do ML.
- Alterações alcançam domínio/adaptadores/use cases/rotas, contratos/UI/formulários, fixtures e testes. Sem migrations ou dependências novas.

## Verificação

- [x] Backend: isolamento, validação, cifra, rotação, desconexão, ausência de fallback e vínculo exato do anúncio.
- [x] UI: estados, conexão de catálogo separada da sessão, geração por URL, formulários e navegação acessível.
- [x] Revisão independente, checks dos pacotes, E2E afetados e inspeção desktop/mobile.
- [x] Documentação e índice Graphify incremental.

Não automatizar senha, CAPTCHA ou MFA; não modificar a sessão nem as credenciais de produção do VHG.
