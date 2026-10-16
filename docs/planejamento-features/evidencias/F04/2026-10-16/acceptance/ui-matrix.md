# F04 — validação de interface

Chromium com Next em build de produção e API/BFF/PostgreSQL reais. Dados sintéticos por tenant, sem envio/cobrança externa. As capturas finais foram abertas e inspecionadas; revisão qualitativa da seção nova, sem baseline anterior de pixels.

| Estado/obrigação | Desktop 1280×720 | Mobile 390×844 | Evidência |
| --- | --- | --- | --- |
| Favoritar pelo catálogo e confirmar estado | Aprovado | Aprovado | E01; DB sem duplicatas após duplo clique |
| Persistência entre reload e sessão nova | Aprovado | Aprovado | E01, leitura privada real |
| Criar e renomear coleção | Aprovado | Aprovado | E01; C01 testa retry com UUID e rascunho |
| Associar favorito em duas coleções | Aprovado | Aprovado | E01; PG T05 |
| Subir e persistir ordem | Aprovado | Aprovado | E01 e PG I03 |
| Cancelar/confirmar exclusão | Aprovado | Aprovado | E01, favorito/catalogo preservados |
| Visitante e outro dono | Aprovado | Aprovado | E02, login e 401/404 sem dados privados |
| Link indisponível sem título/destino | Aprovado | Aprovado | E02, C02 e inspeção Chrome de placeholder |
| Lista vazia | Aprovado | Aprovado | E03, mensagem sem cards |
| Offline e recuperação por Enter | Aprovado | Aprovado | E03, sem apagar nome e com foco na confirmação |
| Loading e bloqueio de envio | Componente aprovado | Mesmo componente | C01, Promise controlada e sucesso não otimista |
| Conflito 409 | PG aprovado | Mesmo contrato | I03; UI conserva rascunho e oferece Atualizar dados; sem E2E exclusivo do conflito |
| Nome inválido e controle de tamanho | U/PG/controle nativo | Mesmo contrato | U04/PG04, required/maxLength |
| Reflow 320px e texto raiz 200% | Aprovado | Aprovado | E03 e capturas finais sem overflow do documento |
| Foco, labels e hierarquia | Inspecionado | Inspecionado | Chrome DOM, outline azul 3px por Tab |
| SEO privado | noindex/nofollow | noindex/nofollow | Metadata existente do painel; E02 e Chrome |

Referência real lida/inspecionada: [GOV.UK Select](https://design-system.service.gov.uk/components/select/), para rótulo, opção vazia e ação de associação explícita. O painel e o renderer locais definem a identidade. Refero indisponível; nenhuma biblioteca instalada.

Na inspeção, o token inexistente space-5 e o global de largura do formulário produziram espaço inadequado. A versão final usa space-6 e wrapper de largura, sem alterar CSS global. Capturas finais conferem separação e largura após a correção.

Limites: emulação não é aparelho físico; sem leitor de tela, zoom nativo ou alegação de conformidade total. Texto raiz 200% não amplia fontes legadas em pixels. Navegação do painel possui rolagem interna própria. Nenhum conteúdo da feature foi mascarado nas capturas.
