# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos
- Location: e2e\profiles.spec.ts:113:5

# Error details

```
Error: locator.isVisible: Error: strict mode violation: getByLabel('Botão principal') resolved to 2 elements:
    1) <dialog open="" data-variant="modal" aria-labelledby="_r_k_" class="overlay-dialog_dialog__TwZOg">…</dialog> aka getByRole('dialog', { name: 'Escolher botão principal' })
    2) <button id="_r_1s_" tabindex="0" type="button" role="combobox" data-placeholder="" aria-expanded="false" aria-haspopup="listbox" class="select_trigger__ZwMOJ" aria-describedby="_r_1s_-description">…</button> aka getByRole('combobox', { name: 'Botão principal' })

Call log:
    - checking visibility of getByLabel('Botão principal')

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - link "Ir para o conteúdo" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - link "Home" [ref=f2e5] [cursor=pointer]:
        - /url: /
      - navigation "Navegação principal" [ref=f2e7]:
        - link "Busca" [ref=f2e8] [cursor=pointer]:
          - /url: /busca
        - link "Painel" [ref=f2e12] [cursor=pointer]:
          - /url: /painel
        - button "Sair" [ref=f2e17] [cursor=pointer]
  - main [ref=f2e21]:
    - complementary [ref=f2e22]:
      - paragraph [ref=f2e23]:
        - text: Meu espaço
        - generic [ref=f2e24]: Tem Link Aqui
      - navigation "Áreas do painel" [ref=f2e26]:
        - generic [ref=f2e27]:
          - paragraph [ref=f2e28]: Seu espaço
          - link "Visão geral" [ref=f2e29] [cursor=pointer]:
            - /url: /painel
          - group [ref=f2e32]:
            - generic "Publicação" [ref=f2e33] [cursor=pointer]
            - generic [ref=f2e39]:
              - link "Links" [ref=f2e40] [cursor=pointer]:
                - /url: /painel/links
              - link "Criar link" [ref=f2e41] [cursor=pointer]:
                - /url: /painel/links/novo
              - link "Minha página" [ref=f2e42] [cursor=pointer]:
                - /url: /painel/perfil
              - link "Convites" [ref=f2e43] [cursor=pointer]:
                - /url: /painel/convites
        - generic [ref=f2e44]:
          - paragraph [ref=f2e45]: Acompanhar
          - link "Pedidos" [ref=f2e46] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f2e49] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f2e52] [cursor=pointer]:
            - /url: /painel/favoritos
        - generic [ref=f2e55]:
          - paragraph [ref=f2e56]: Preferências
          - link "Conta" [ref=f2e57] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f2e60]:
      - heading "Minha página de links" [level=1] [ref=f2e63]
      - region "Editor do perfil" [ref=f2e65]:
        - region "Alterações não publicadas" [ref=f2e66]:
          - strong [ref=f2e67]: Tem alterações não publicadas
          - generic [ref=f2e68]:
            - generic "Disponível depois da primeira publicação" [ref=f2e69]:
              - button "Descartar" [disabled] [ref=f2e70]
            - button "Publicar" [ref=f2e72] [cursor=pointer]
        - generic [ref=f2e75]:
          - button "Ver prévia" [ref=f2e76] [cursor=pointer]
          - button "Atualizar dados" [ref=f2e80] [cursor=pointer]
        - tablist "Seções da minha página" [ref=f2e86]:
          - tab "Grupos e links" [selected] [ref=f2e87] [cursor=pointer]
          - tab "Página" [ref=f2e88] [cursor=pointer]
          - tab "Aparência" [ref=f2e89] [cursor=pointer]
        - form "Editar perfil" [ref=f2e90]:
          - tabpanel "Grupos e links" [ref=f2e91]:
            - group "Dados da página" [ref=f2e92]:
              - region "Grupos e links da página" [ref=f2e94]:
                - generic [ref=f2e95]:
                  - heading "Grupos e links" [level=2] [ref=f2e96]
                  - generic [ref=f2e97]:
                    - button "Botão principal" [ref=f2e98] [cursor=pointer]
                    - button "Adicionar grupo" [ref=f2e100] [cursor=pointer]
                - paragraph [ref=f2e104]: Arraste pela alça ou use Mover para ordenar. No teclado, use as setas na alça.
                - list [ref=f2e105]:
                  - listitem [ref=f2e106]:
                    - generic [ref=f2e107]:
                      - generic [ref=f2e108]: 3 links
                      - button "Arrastar grupo Materiais" [ref=f2e110]
                    - button [ref=f2e113] [cursor=pointer]:
                      - strong [ref=f2e114]: Materiais
                      - generic [ref=f2e115]: Abrir grupo
                    - group [ref=f2e118]:
                      - generic "Mover" [ref=f2e119] [cursor=pointer]
                  - listitem [ref=f2e120]:
                    - generic [ref=f2e121]:
                      - generic [ref=f2e122]: 1 link
                      - button "Arrastar grupo Redes sociais" [ref=f2e124]
                    - button [ref=f2e127] [cursor=pointer]:
                      - strong [ref=f2e128]: Redes sociais
                      - generic [ref=f2e129]: Abrir grupo
                    - group [ref=f2e132]:
                      - generic "Mover" [ref=f2e133] [cursor=pointer]
                - dialog [ref=f2e134]:
                  - generic [ref=f2e135]:
                    - generic [ref=f2e136]:
                      - heading "Escolher botão principal" [level=2] [ref=f2e137]
                      - button "Fechar janela" [active] [ref=f2e138] [cursor=pointer]
                    - generic [ref=f2e142]:
                      - generic [ref=f2e144]:
                        - generic [ref=f2e145]: Botão principal
                        - generic [ref=f2e147]:
                          - combobox "Botão principal" [ref=f2e148] [cursor=pointer]:
                            - generic [ref=f2e149]: Sem botão principal
                          - textbox [aria-hidden] [ref=f2e153]
                        - generic [ref=f2e154]: Escolha o link que aparece no topo da sua página.
                      - generic [ref=f2e155]:
                        - button "Cancelar" [ref=f2e156] [cursor=pointer]
                        - button "Concluir" [ref=f2e158] [cursor=pointer]
  - contentinfo [ref=f2e160]:
    - generic [ref=f2e161]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e162]:
      - link "Termos" [ref=f2e163] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e164] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e165] [cursor=pointer]
  - alert [ref=f2e166]
```

# Test source

```ts
  1  | import { expect, type Locator } from '@playwright/test'
  2  | 
  3  | export async function selectOption(control: Locator, option: string | { label: string }) {
  4  |   const area = control.locator('xpath=ancestor::*[@data-responsive-area][1]')
  5  |   if (await area.count() && !await control.isVisible()) {
  6  |     const tab = typeof option === 'string' ? area.getByRole('tab').and(control.page().locator(`[data-value=${JSON.stringify(option)}]`)) : area.getByRole('tab', { name: option.label, exact: true })
  7  |     await tab.click()
  8  |     await expect(tab).toHaveAttribute('aria-selected', 'true')
  9  |     return
  10 |   }
> 11 |   if (!await control.isVisible()) {
     |                      ^ Error: locator.isVisible: Error: strict mode violation: getByLabel('Botão principal') resolved to 2 elements:
  12 |     const filters = control.locator('xpath=ancestor::*[@data-workspace-filters][1]')
  13 |     if (await filters.count()) await filters.getByRole('button', { name: 'Ver mais filtros', exact: true }).click()
  14 |   }
  15 |   if (await control.evaluate(element => element.tagName === 'SELECT')) {
  16 |     await control.selectOption(option)
  17 |     return
  18 |   }
  19 |   await control.click()
  20 |   const choices = control.page().getByRole('option')
  21 |   const choice = typeof option === 'string' ? choices.and(control.page().locator(`[data-value=${JSON.stringify(option)}]`)) : control.page().getByRole('option', { name: option.label, exact: true })
  22 |   await choice.click()
  23 |   await expect(control).toBeFocused()
  24 | }
  25 | 
  26 | export async function expectSelected(control: Locator, value: string) {
  27 |   await expect(control.locator('[data-select-value]')).toHaveAttribute('data-select-value', value)
  28 | }
  29 | 
```