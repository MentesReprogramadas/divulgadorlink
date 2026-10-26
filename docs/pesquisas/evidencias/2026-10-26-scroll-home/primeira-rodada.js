async (page) => {
 const results=[];
 for(const device of ['desktop','mobile']){
  const context=await page.context().browser().newContext({viewport:device==='desktop'?{width:1365,height:900}:{width:390,height:844},isMobile:device==='mobile',hasTouch:device==='mobile',deviceScaleFactor:device==='mobile'?2:1,reducedMotion:'no-preference',storageState:{cookies:[],origins:[]}});
  await context.addCookies([{name:'tla_consent',value:'denied',domain:'temlinkaqui.com',path:'/'}]);
  const p=await context.newPage();const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
  try{
   await p.goto('https://temlinkaqui.com/',{waitUntil:'domcontentloaded',timeout:20000});
   await p.getByRole('combobox').first().waitFor({timeout:12000});await p.waitForTimeout(1800);
   await p.addStyleTag({content:'html[data-probe-flat] [data-optics],html[data-probe-flat] [class*="ond as"] {display:none!important} html[data-probe-flat] * {backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'});
   const metadata=await p.evaluate(()=>({lenses:document.querySelectorAll('[data-optics]').length,refractive:document.querySelectorAll('[data-optics=refractive]').length,canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,renderer:c.dataset.renderer})),height:document.documentElement.scrollHeight,dpr:devicePixelRatio,userAgent:navigator.userAgent,support:PerformanceObserver.supportedEntryTypes}));
   for(const mode of ['default','still','no-lens','flat','default-repeat']){
    await p.emulateMedia({reducedMotion:mode==='still'||mode==='flat'?'reduce':'no-preference'});
    await p.evaluate(mode=>{document.documentElement.toggleAttribute('data-probe-flat',mode==='no-lens'||mode==='flat');window.scrollTo(0,0)},mode);await p.waitForTimeout(350);
    const before=await cdp.send('Performance.getMetrics');
    await p.evaluate(()=>{window.__scrollProbe={frames:[],long:[],running:true};const l=window.__scrollProbe;l.observer=new PerformanceObserver(list=>l.long.push(...list.getEntries().map(e=>e.duration)));l.observer.observe({type:'longtask'});let prev;requestAnimationFrame(function frame(now){if(prev)l.frames.push(now-prev);prev=now;if(l.running)requestAnimationFrame(frame)});});
    await p.mouse.move(device==='desktop'?1200:300,400);
    for(let i=0;i<12;i++){await p.mouse.wheel(0,240);await p.waitForTimeout(45)}
    await p.waitForTimeout(250);
    const after=await cdp.send('Performance.getMetrics');
    const sample=await p.evaluate(()=>{const l=window.__scrollProbe;l.running=false;l.observer.disconnect();const f=l.frames.slice().sort((a,b)=>a-b);return {samples:f.length,p50:Math.round(f[Math.floor(f.length*.5)]||0),p95:Math.round(f[Math.floor(f.length*.95)]||0),max:Math.round(Math.max(0,...f)),over34:f.filter(v=>v>34).length,longTasks:l.long.length,longestTask:Math.round(Math.max(0,...l.long)),scrollY:Math.round(scrollY)}});
    const delta={};for(const name of ['TaskDuration','LayoutDuration','RecalcStyleDuration','ScriptDuration'])delta[name]=Math.round(1000*((after.metrics.find(x=>x.name===name)?.value||0)-(before.metrics.find(x=>x.name===name)?.value||0)));
    results.push({device,mode,...sample,...delta,...(mode==='default'?{metadata}:{})});
   }
  }finally{await context.close()}
 }
 return {url:'https://temlinkaqui.com/',cpuSlowdown:4,networkThrottle:'none',interaction:'12 wheel events of 240px, 45ms apart; 250ms tail',metric:'requestAnimationFrame intervals, not actual presented FPS nor INP',results};
}
