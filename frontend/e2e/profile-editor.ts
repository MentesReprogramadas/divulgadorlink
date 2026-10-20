import {expect,type Page} from '@playwright/test'
const routes:Record<string,string>={'Campanhas':'campanhas','Exportar página':'exportar','Importar e exportar':'exportar','Importar links':'importar','Modelos':'modelos','Histórico':'historico','Métricas':'metricas','Checklist':'checklist','Mídia kit':'midia-kit','Apresentação para parceiros':'midia-kit'}
/** Tools are destinations in the sidebar, shared by mobile and desktop. */
export async function profileEditorTool(page:Page,label:string){
 const destination=routes[label];if(!destination){const toolbar=page.getByLabel('Navegação e ações da minha página',{exact:true});const button=toolbar.getByRole('button',{name:label,exact:true});if(!await button.isVisible())await toolbar.getByLabel('Mais opções da página',{exact:true}).click();await expect(button).toBeVisible();await button.click();return}
 const mobile=page.getByRole('button',{name:'Menu',exact:true});if(await mobile.isVisible())await mobile.click()
 const nav=page.getByRole('navigation',{name:'Áreas do painel'}).filter({visible:true});const menu=nav.locator('details').filter({has:page.locator('summary > span',{hasText:/^Minha página$/})});if(!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope > summary').click()
 const link=nav.locator('a[href="/painel/perfil/'+destination+'"]');const section=link.locator('xpath=ancestor::details[1]');if(!await section.evaluate(el=>(el as HTMLDetailsElement).open))await section.locator(':scope > summary').click();await expect(link).toBeVisible();await link.click()
}
