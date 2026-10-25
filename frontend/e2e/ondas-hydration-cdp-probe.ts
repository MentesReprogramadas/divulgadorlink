import { expect, type CDPSession, type Page, type TestInfo } from '@playwright/test'

// Opt-in diagnostic for the unmodified production React chunk used by this review.
// The conditional breakpoint records the throw-site state and evaluates false:
// no pause, response interception, suppressed error, source/build change or retry.
const chunk = '4bd1b696-100b9d70ed4e49c1.js'
const condition = `(function(){
try{
  const name=t=>typeof t==="function"?t.displayName||t.name:typeof t==="string"?t:String(t);
  const node=t=>t?{nodeType:t.nodeType,name:t.nodeName,html:t.outerHTML||t.nodeValue}:null;
  const props=t=>Object.fromEntries(Object.entries(t||{}).filter(([key,value])=>["string","number","boolean"].includes(typeof value)||value===null));
  const fiber=t=>t?{type:name(t.type),tag:t.tag,key:t.key,index:t.index,flags:t.flags,subtreeFlags:t.subtreeFlags,lanes:t.lanes,childLanes:t.childLanes,stateNode:node(t.stateNode),pendingProps:props(t.pendingProps),memoizedProps:props(t.memoizedProps),hasAlternate:!!t.alternate}:null;
  const chain=[];
  for(let f=e;f&&chain.length<40;f=f.return)chain.push({type:name(f.type),tag:f.tag,key:f.key,index:f.index,className:f.pendingProps?.className,flags:f.flags,subtreeFlags:f.subtreeFlags,lanes:f.lanes,childLanes:f.childLanes,hasAlternate:!!f.alternate});
  const mismatch={time:performance.now(),url:location.href,stack:new Error("React 418 throw-site probe").stack,expected:fiber(e),expectedAlternate:fiber(e.alternate),expectedParent:fiber(e.return),expectedParentAlternate:fiber(e.return?.alternate),actual:node(rN),actualParent:node(rN?.parentNode),hydrationParent:fiber(rP),hydrationParentAlternate:fiber(rP?.alternate),identity:{hydrationParentIsExpected:rP===e,expectedStateNodeIsActual:e.stateNode===rN,expectedStateNodeIsActualParent:e.stateNode===rN?.parentNode,hydrationParentStateNodeIsActualParent:rP?.stateNode===rN?.parentNode},chain,html:document.documentElement.outerHTML};
  (window.__ondasCdpMismatch??=[]).push(mismatch);
  window.__ondasCaptureHydrationMismatch(JSON.stringify(mismatch));
}catch(error){(window.__ondasCdpProbeErrors??=[]).push(String(error))}
return false
})()`

type Mismatch = { html: string; url: string; [key: string]: unknown }

type ProbeState = {
  session: CDPSession
  breakpointId: string
  locations: unknown[]
  pageErrors: Array<{ message: string; stack?: string; url: string }>
  documents: Array<{ url: string; status: number; body: Promise<string> }>
  mismatches: Mismatch[]
  probeErrors: string[]
}
const probes = new WeakMap<Page, ProbeState>()

export async function installHydrationCdpProbe(page: Page) {
  if (process.env.ONDAS_HYDRATION_CDP !== '1' && !process.env.ONDAS_VISUAL_BATCH?.endsWith('-cdp')) return
  const session = await page.context().newCDPSession(page)
  await session.send('Runtime.enable')
  await session.send('Runtime.addBinding', { name: '__ondasCaptureHydrationMismatch' })
  await session.send('Debugger.enable')
  const response = await session.send('Debugger.setBreakpointByUrl', {
    urlRegex: '/_next/static/chunks/' + chunk.replaceAll('.', '\\.') + '(?:\\?.*)?$',
    lineNumber: 0, columnNumber: 35055, condition,
  })
  const state: ProbeState = { session, breakpointId: response.breakpointId, locations: [...response.locations], pageErrors: [], documents: [], mismatches: [], probeErrors: [] }
  probes.set(page, state)
  session.on('Debugger.breakpointResolved', (event: { breakpointId: string; location: unknown }) => {
    if (event.breakpointId === state.breakpointId) state.locations.push(event.location)
  })
  session.on('Runtime.bindingCalled', (event: { name: string; payload: string; executionContextId: number }) => {
    if (event.name !== '__ondasCaptureHydrationMismatch') return
    try { state.mismatches.push({ ...JSON.parse(event.payload) as Mismatch, executionContextId: event.executionContextId }) }
    catch (error) { state.probeErrors.push('Cannot decode throw-site payload: ' + String(error)) }
  })
  page.on('pageerror', error => state.pageErrors.push({ message: error.message, stack: error.stack, url: page.url() }))
  page.on('response', response => {
    if (response.request().resourceType() === 'document') state.documents.push({ url: response.url(), status: response.status(), body: response.text().catch(() => '') })
  })
}

export async function attachHydrationCdpProbe(page: Page, info: TestInfo) {
  const state = probes.get(page)
  if (!state) return
  try {
    const captured = await page.evaluate(() => {
      const state = window as Window & { __ondasCdpMismatch?: Array<{ html: string; url: string }>; __ondasCdpProbeErrors?: string[] }
      return { mismatches: state.__ondasCdpMismatch ?? [], probeErrors: state.__ondasCdpProbeErrors ?? [] }
    }).catch(error => ({ mismatches: [], probeErrors: ['Cannot read current document: ' + String(error)] }))
    const mismatches = state.mismatches.length ? state.mismatches : captured.mismatches
    const probeErrors = [...state.probeErrors, ...captured.probeErrors]
    await info.attach('hydration-cdp-throw-site.json', { contentType: 'application/json', body: JSON.stringify({
      chunk, columnNumber: 35055, mode: 'conditional-breakpoint-false', resolvedLocations: state.locations,
      pageErrors: state.pageErrors, mismatches, probeErrors,
      documents: state.documents.map(document => ({ url: document.url, status: document.status })),
    }, null, 2) })
    for (const [index, mismatch] of mismatches.entries()) {
      await info.attach('hydration-cdp-' + index + '-before-throw.html', { contentType: 'text/html', body: mismatch.html })
      const server = state.documents.findLast(document => document.url === mismatch.url)
      if (server) await info.attach('hydration-cdp-' + index + '-server.html', { contentType: 'text/html', body: await server.body })
    }
    // No browser error is removed or tolerated by this diagnostic.
    expect.soft(state.locations.length, 'The throw-site breakpoint must resolve in the actual production chunk').toBeGreaterThan(0)
    expect.soft(probeErrors, 'Diagnostic capture must not fail silently').toEqual([])
    expect.soft(state.pageErrors, 'Browser errors remain test failures').toEqual([])
  } finally {
    await state.session.send('Debugger.removeBreakpoint', { breakpointId: state.breakpointId }).catch(() => undefined)
    await state.session.detach().catch(() => undefined)
    probes.delete(page)
  }
}
