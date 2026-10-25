import type { Page } from '@playwright/test'

export async function settleAnimations(page:Page){
  await page.evaluate(async()=>{
    const animations=document.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime))
    await Promise.all(animations.map(animation=>animation.finished.catch(()=>undefined)))
  })
}

/** Avoid stitched full-page artifacts from sticky elements and native dialog backdrops. */
export async function capturePage(page:Page,path:string,fullPage=true){
  if(fullPage)await page.evaluate(()=>new Promise<void>(resolve=>{window.scrollTo(0,0);requestAnimationFrame(()=>resolve())}))
  await page.screenshot({path,fullPage,animations:'disabled'})
}
