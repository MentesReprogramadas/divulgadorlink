import type { Page } from '@playwright/test'
/** Avoid stitched full-page artifacts from sticky elements and native dialog backdrops. */
export async function capturePage(page:Page,path:string,fullPage=true){
  if(fullPage)await page.evaluate(()=>new Promise<void>(resolve=>{window.scrollTo(0,0);requestAnimationFrame(()=>resolve())}))
  await page.screenshot({path,fullPage,animations:'disabled'})
}
