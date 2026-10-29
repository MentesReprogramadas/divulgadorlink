# Ofertas avaliadas, prévia única e envios rápidos

Pedido consolidado: expandir termos com OpenAI, percorrer além de três páginas, avaliar desconto/reputação/histórico e explicar decisões; clicar no produto abre prévia com foto, título objetivo, preços e link, permitindo enviar ou descartar; paginação de produtos e envios, contador/barra até atualização e forçar atualização; iniciar termos/coleta ao criar segmentação.

Workspace existente `C:/VSCODE/temlink-afiliados`, preservando árvore suja, marca Ondas, autenticação/tenant/CSRF, dados existentes, leases/idempotência e resultados incertos sem reenvio automático. Sem branch, commit, push, deploy ou reutilização de instâncias/grupos do VHG. A autorização explícita desta etapa permite chamadas OpenAI para termos e títulos; usar a chave já configurada no projeto apenas no servidor, sem exibi-la.

## Decisões

1. OpenAI expande termos relevantes e sugere títulos curtos em português, naturais, objetivos, sem humor, trocadilhos ou urgência inventada, com no máximo emojis pontuais. Dados externos são tratados como dados, não instruções. Preços, descontos, reputação e fatos nunca são inventados pela IA; resultados estruturados validados, timeout/caches e fallback seguro.
2. Histórico próprio começa nas observações realmente disponíveis. Distinguir desconto informado pelo ML de queda comprovada por observações em dias distintos. Ausência de histórico/reputação é evidência insuficiente, não aprovação nem reputação presumida. Política inicial transparente: reputação verde, desconto informado relevante ou queda observada; os limiares vêm do backend e aparecem nos motivos. Produtos selecionados, em análise e descartados ficam explicáveis.
3. Paginação percorre páginas posteriores conforme o total retornado pelo ML, dentro dos limites efetivos do provedor e de trabalho por ciclo. Expor termo/página de origem e navegação anterior/próxima; não afirmar cobertura total. Forçar atualização prioriza a solicitação sem invalidar uma coleta ativa ou contornar limites do ML. Contagem e barra usam nextRunAt real.
4. Ao abrir o produto, revalidar a cotação, gerar link e título e apresentar a mensagem exata, foto, preços atual/anterior e destino. Quando não houver preço anterior verificável, informar isso; nunca fabricar um valor riscado. Enviar no modal é a confirmação explícita. Persistir oferta e aprovação internamente numa única operação, sem etapa manual de cadastro. Cancelar não aprova envio; descartar é decisão persistente da segmentação.
5. Envio imediato inicia o processamento após o commit; worker de afiliados independente de um minuto/timer geral, mantendo intervalo seguro por conta, rotação, locks e tratamento de resposta incerta. Mostrar progresso real dos destinos. Envios em cards paginados, com contadores, imagem, resumo e acesso aos detalhes.
6. Ao concluir a criação da segmentação, gerar os termos e agendar coleta automaticamente em segundo plano. Não criar grupo nem enviar mensagens como efeito da criação.

## Escopo de implementação

- Descoberta, domínio de avaliação, observações de preço e decisões, reputação, OpenAI e migrations necessárias; fixtures e testes.
- API de prévia/confirmar/descarte, geração vinculada ao anúncio, aprovação transacional e processamento imediato; API paginada de envios.
- UI de produtos com motivos, paginação, atualização/contador e modal único; nova composição da tela de envios. Preservar ferramentas manuais como complemento.
- Migrações somente em bancos locais identificados; fontes VHG somente leitura, sem refresh de tokens ou alterações na produção de origem.

## Verificação

- [x] Contratos, fontes oficiais e implementação da descoberta/IA/histórico/reputação.
- [x] Prévia fiel, envio transacional/idempotente, descarte persistido e fila responsiva.
- [x] Produtos/envios paginados, atualização forçada/contador e início automático na criação.
- [x] Testes unitários/HTTP/PostgreSQL, integração isolada sem mensagens reais, lint/tipos/build.
- [x] Inspeção desktop/mobile/teclado, revisão independente, documentação e Graphify incremental.

Resultados e limites: [relatório final](../../relatorios/2026-10-28-afiliados-ofertas-reais-preview-envios.md).

## Fontes

- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat
- ML reputação: https://developers.mercadolivre.com.br/pt_br/produto-consulta-de-usuarios/reputacao-de-vendedores
- ML paginação: https://developers.mercadolivre.com.br/pt_br/consideracoes-de-design

Brainstorming aplicado ao pedido detalhado existente: autorizações anteriores para executar sem pausas prevalecem sobre checkpoints genéricos da skill. Sem necessidade de nova aprovação de desenho; a opção escolhida reutiliza serviços/componentes existentes e acrescenta apenas dados e fluxos exigidos pelo pedido.
