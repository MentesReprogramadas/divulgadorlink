# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contact-forms.spec.ts >> F09-G02 prévia acompanha os dados nas quatro abas sem alterar a publicação
- Location: e2e\contact-forms.spec.ts:32:5

# Error details

```
Error: frame.evaluate: Error: No elements found for include in page Context
    at validateContext (eval at evaluate (:311:30), <anonymous>:23741:15)
    at new Context (eval at evaluate (:311:30), <anonymous>:23722:7)
    at Object._getFrameContexts (eval at evaluate (:311:30), <anonymous>:23763:22)
    at eval (eval at evaluate (:311:30), <anonymous>:4:27)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- generic [ref=f7e1]:
  - link "Ir para o conteúdo" [ref=f7e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f7e3]:
    - generic [ref=f7e4]:
      - link "Home" [ref=f7e5] [cursor=pointer]:
        - /url: /
      - button "Menu" [ref=f7e7] [cursor=pointer]
  - main [ref=f7e11]:
    - generic [ref=f7e12]:
      - heading "Dados da página" [level=1] [ref=f7e15]
      - region "Editor do perfil" [ref=f7e17]:
        - region "Alterações não publicadas" [ref=f7e18]:
          - strong [ref=f7e19]: Tem alterações não publicadas
          - generic [ref=f7e20]:
            - button "Descartar" [ref=f7e22] [cursor=pointer]
            - button "Publicar" [ref=f7e26] [cursor=pointer]
        - generic "Navegação e ações da minha página" [ref=f7e30]:
          - tablist "Seções da minha página" [ref=f7e33]:
            - tab "Visão geral" [ref=f7e34] [cursor=pointer]
            - tab "Grupos e links" [ref=f7e35] [cursor=pointer]:
              - generic [aria-hidden] [ref=f7e36]: Links
            - tab "Página" [selected] [ref=f7e37] [cursor=pointer]
            - tab "Aparência" [ref=f7e38] [cursor=pointer]
          - generic [ref=f7e40]:
            - button "Ver prévia" [ref=f7e41] [cursor=pointer]
            - button "Atualizar dados" [ref=f7e45] [cursor=pointer]
            - group [ref=f7e49]:
              - generic "Mais opções da página" [ref=f7e50] [cursor=pointer]
        - generic [ref=f7e55]:
          - generic [ref=f7e56]:
            - form "Editar perfil" [ref=f7e57]:
              - tabpanel "Página" [ref=f7e58]:
                - group "Dados da página" [ref=f7e59]:
                  - group "Página" [ref=f7e61]:
                    - generic "Alteração não publicada" [ref=f7e63]:
                      - generic [ref=f7e64]:
                        - generic [ref=f7e65]:
                          - generic [ref=f7e66]: Nome da página
                          - generic [aria-hidden] [ref=f7e67]: "*"
                        - textbox "Nome da página" [ref=f7e68]:
                          - /placeholder: "Ex.: Receitas da Ana"
                          - text: Novo nome no rascunho
                    - generic [ref=f7e70]:
                      - generic [ref=f7e71]:
                        - generic [ref=f7e72]: Endereço da página
                        - generic [aria-hidden] [ref=f7e73]: "*"
                      - textbox "Endereço da página" [ref=f7e74]:
                        - /placeholder: receitas-da-ana
                        - text: preview-live
                      - generic [ref=f7e75]: Retire a página do ar para mudar o endereço.
                    - generic [ref=f7e77]:
                      - generic [ref=f7e78]: Descrição
                      - textbox "Descrição" [ref=f7e80]: Criação e projetos
                    - generic [ref=f7e83]:
                      - generic [ref=f7e84]: Foto do perfil
                      - generic [ref=f7e85] [cursor=pointer]:
                        - generic [ref=f7e89]:
                          - strong [ref=f7e90]: Escolher foto
                          - generic [ref=f7e91]: Toque para escolher ou arraste uma imagem.
                        - button "Foto do perfil" [ref=f7e92]
                      - paragraph [ref=f7e93]: PNG, JPG ou WebP até 5 MB. Comprimida automaticamente em WebP. Vai ao ar após publicar.
                    - generic [ref=f7e95]:
                      - checkbox "Conteúdo para maiores de 18 anos" [ref=f7e96] [cursor=pointer]
                      - text: Conteúdo para maiores de 18 anos
                    - region "Busca da página" [ref=f7e97]:
                      - heading "Busca e filtros" [level=2] [ref=f7e98]
                      - generic "Alteração não publicada" [ref=f7e101]:
                        - generic [ref=f7e102]:
                          - checkbox "Exibir busca na minha página" [checked] [ref=f7e103] [cursor=pointer]
                          - text: Exibir busca na minha página
                      - paragraph [ref=f7e104]: Ajude visitantes a encontrar links e filtrar por grupo. Publique para aplicar.
            - region "Formulário da minha página" [ref=f7e105]:
              - generic [ref=f7e106]:
                - heading "Receba mensagens pela sua página" [level=2] [ref=f7e107]
                - generic [ref=f7e110]: Desativado
              - paragraph [ref=f7e112]: Adicione um formulário para pedidos de contato, orçamento ou lista de interesse.
              - group "Ações da página" [ref=f7e113]:
                - link "Ver contatos recebidos" [ref=f7e114] [cursor=pointer]:
                  - /url: /painel/perfil/contatos
                - button "Configurar formulário" [ref=f7e117] [cursor=pointer]
              - dialog [ref=f7e121]:
                - generic [ref=f7e122]:
                  - generic [ref=f7e123]:
                    - heading "Formulário da sua página" [level=2] [ref=f7e124]
                    - button "Fechar janela" [ref=f7e125] [cursor=pointer]
                  - form "Configurar formulário de contato" [ref=f7e129]:
                    - generic [ref=f7e130]:
                      - list "Etapas do formulário" [ref=f7e131]:
                        - listitem [ref=f7e132]:
                          - button "1 Ativação e privacidade" [disabled] [ref=f7e133]:
                            - generic [aria-hidden] [ref=f7e134]: "1"
                            - generic [ref=f7e135]: Ativação e privacidade
                        - listitem [ref=f7e136]:
                          - button "2 Campos do formulário" [disabled] [ref=f7e137]:
                            - generic [aria-hidden] [ref=f7e138]: "2"
                      - paragraph [ref=f7e139]: "Etapa 1 de 2: Ativação e privacidade"
                    - generic [ref=f7e140] [cursor=pointer]:
                      - checkbox "Mostrar formulário na página publicada" [checked] [active] [ref=f7e141]
                      - text: Mostrar formulário na página publicada
                    - generic [ref=f7e142]:
                      - generic [ref=f7e143]: O que você quer receber?
                      - generic [ref=f7e145]:
                        - combobox "O que você quer receber?" [ref=f7e146] [cursor=pointer]:
                          - generic [ref=f7e147]: Fale comigo
                        - textbox [aria-hidden] [ref=f7e153]: contact
                    - generic [ref=f7e154] [cursor=pointer]:
                      - checkbox "Oferecer aceite opcional para novidades" [ref=f7e155]
                      - text: Oferecer aceite opcional para novidades
                    - paragraph [ref=f7e156]: Em páginas publicadas, salvar atualiza o formulário imediatamente. Contatos privados por até 180 dias; nenhum envio ou inscrição automática.
                    - group "Ações da página" [ref=f7e157]:
                      - button "Escolher campos" [ref=f7e158] [cursor=pointer]
          - complementary "Prévia ao vivo da página" [ref=f7e162]:
            - button "Ver prévia ao vivo" [ref=f7e163] [cursor=pointer]
  - contentinfo [ref=f7e168]:
    - generic [ref=f7e169]: Tem Link Aqui
    - navigation "Informações do site" [ref=f7e170]:
      - link "Termos" [ref=f7e171] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f7e172] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f7e173] [cursor=pointer]
  - alert [ref=f7e174]
```