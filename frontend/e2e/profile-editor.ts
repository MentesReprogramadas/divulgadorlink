import { expect, type Page } from '@playwright/test'

/** Tools retain their labels whether they fit in the row or move into the disclosure. */
export async function profileEditorTool(page:Page,label:string){
 const toolbar=page.getByLabel('Navegação e ações da minha página',{exact:true})
 const button=toolbar.getByRole('button',{name:label,exact:true})
 if(!await button.isVisible())await toolbar.getByLabel('Mais opções da página',{exact:true}).click()
 await expect(button).toBeVisible();await button.click()
}
