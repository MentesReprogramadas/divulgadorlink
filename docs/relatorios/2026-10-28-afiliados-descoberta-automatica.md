# Descoberta automática e imagens das ofertas

Implementação local em `C:/VSCODE/temlink-afiliados`, sem commit, push ou deploy. Instâncias, grupos, histórico e a conta de origem VHG preservados.

## Resultado

Ofertas de uma segmentação abre Sugestões para o seu tema. O nome é o termo padrão; O que procurar nesta segmentação permite definir até cinco termos e pausar/retomar. O worker coleta mesmo sem manter a tela aberta. A coleta inicial consulta três páginas, publicando resultados parciais; depois consulta uma página a cada 15 minutos, alternando termos e páginas. Atualizar sugestões não exige redigitar uma pesquisa.

As fotos reais aparecem nas sugestões, no catálogo manual e nas ofertas preparadas. Há dimensões estáveis, carregamento tardio e fallback para imagem ausente/recusada. Buscar outro produto reúne as ferramentas complementares. Preparar oferta gera o link explicitamente; salvar e enviar continuam exigindo revisão.

## Diagnóstico real

A consulta antiga examinava somente as quatro primeiras fichas de catálogo; a correção anterior ampliou para vinte. Em Natal, a primeira página devolveu apenas um anúncio com vendedor/preço. Isso não representa todos os produtos de Natal nem todos os produtos elegíveis do ML.

Consultas oficiais somente de leitura confirmaram: vinte fichas por página; página inicial com um anúncio, offset20 com três e offset40 com um. Os vinte produtos iniciais já tinham imagens `pictures[].url`. Detalhes de três produtos estavam ativos e tinham fotos, mas sem buy box utilizável; atividade da ficha não comprova anúncio comprável. A busca geral de anúncios retornou403 e não foi contornada.

Após a coleta automática real, Natal ficou READY com **cinco anúncios**, sessenta fichas consultadas, cinquenta e cinco sem anúncio na resposta e zero falhas. Todas as cinco fotos carregaram do domínio `http2.mlstatic.com`. Nenhuma oferta foi salva nem mensagem real enviada pela validação.

## Engenharia e proteção

- Tabela dedicada `affiliate_discoveries`, migration aditiva `20261028230000_affiliate_discovery`, aplicada somente aos bancos locais identificados. O cache não altera o updatedAt usado no provisionamento de grupos.
- Lease de quatro minutos, CAS por configuração/segmentação, limite de cem produtos e validade de 24 horas. Pausa, troca de termos ou renomeação do tema implícito invalidam dados antigos. Atualizar preserva coleta em andamento e tem cooldown.
- GET é somente leitura; POST administrativo agenda coleta persistida e dá início em segundo plano. Autorizações do admin/tenant e CSRF mantidas. A coleta não salva ofertas, gera links ou envia mensagens.
- Contadores da última coleta separados do tamanho do cache acumulado. Falhas, esgotamento do polling e retomada da aba têm recuperação explícita; READY confere o cache a cada minuto enquanto a tela está visível.
- CSP libera imagens mlstatic apenas em `/admin/afiliados` e suas subrotas. A validação de imagem real e o E2E ocorreram com CSP ativa. A ponte mantém dois SSH ativos e uma fila FIFO de até quatro solicitações por doze segundos, evitando conflito entre status e lotes; não amplia permissões nem altera a origem VHG.

## Verificações

Frontend: 890 testes em223 arquivos aprovados; lint, typecheck e build aprovados em `.next`, preservando o dev `.next-ondas-demo`. Dez casos UI desktop/mobile cobertos e quatro integrações locais aprovadas; houve repetição de seletores atualizados e correção da CSP comprovada pelo E2E com imagem decodificada, sem bypass. O envio permaneceu inexistente antes da revisão/confirmacão explícitas nos testes.

Backend afetado: testes de descoberta, autorização, concorrência e PostgreSQL aprovados, incluindo cache parcial, alteração de termos durante coleta, leases e escopo. A ponte passou nove testes; a política de imagens passou dezesseis testes. Lint, tipos e build aprovados. A suíte ampla revelou uma falha preexistente de atomicidade da expiração Pix; [a correção](2026-10-28-pix-expiracao-atomica.md) preservou as regras comerciais e as provas originais.

Fechamento: **838 testes backend em182 arquivos aprovados**, incluindo as provas Pix originais. Checkout PostgreSQL:16 testes, incluindo rollback dos quatro estados terminais. A migration76 foi aplicada somente ao banco operacional local e ao banco descartável de regressão. Ao terminar, o banco de regressão e seu Redis5641 foram removidos; PostgreSQL5638, banco operacional `affiliate_ops`, Redis5640 e dados reais foram preservados. API3351 e worker reiniciados com o código final; frontend3016 e ponte4452 permanecem locais.

Inspeção real desktop1440 e mobile390: cinco imagens decodificadas, ferramentas manuais recolhidas, teclado até termos, sem overflow horizontal, também em zoom CSS200%. Capturas inspecionadas em `output/local-affiliates/guided/discovery-real-five-{desktop,mobile}.png`. Axe em main não encontrou violações no estado inspecionado, mas marcou contraste como incompleto; a injeção do auditor usou contexto isolado de instrumentação. Isso não certifica acessibilidade integral. Detector regex Impeccable: 29 arquivos, sem achados; regras que exigem página não se aplicam nesse modo.

## Limites e reversão

A coleta continua sendo uma amostra autenticada de catálogo, não um índice completo de ofertas elegíveis. A disponibilidade e os preços podem mudar; gerar link não comprova comissão. Sessão própria ainda depende das credenciais/autorização fornecidas pelo operador. Não foi validada troca de outra conta real nem envio real ao WhatsApp.

Reversão seletiva: remover a drenagem de descoberta e seu registro de rotas/UI, preservando grupos/ofertas/entregas. A tabela pode permanecer inerte; não apagar dados operacionais automaticamente. Sem bibliotecas novas. Código, contratos e testes foram indexados incrementalmente no Graphify, sem LLM/API/envio externo; CSS, Prisma e imagens exigem as verificações próprias acima.
