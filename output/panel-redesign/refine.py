from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks')
def edit(file, pairs):
 p=root/file; s=p.read_text(encoding='utf-8')
 for a,b in pairs:
  if a not in s: print('Missing:',file,a[:65])
  s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
for file,title in [('frontend/src/app/admin/planos/page.tsx','Planos de destaque'),('frontend/src/app/admin/moderacao/page.tsx','Moderação'),('frontend/src/app/admin/estornos/page.tsx','Estornos'),('frontend/src/app/painel/conta/page.tsx','Conta')]:
 edit(file,[(f'<h2 className="panel-section-title">{title}</h2>','')])
edit('frontend/src/components/domain/panel.tsx',[(f'<h2 className="panel-section-title">{t}</h2>','') for t in ['Seus links','Pedidos de destaque']])
for file,title in [('frontend/src/features/moderation/report-queue.tsx','Denúncias'),('frontend/src/features/availability/url-proposal-queue.tsx','Correções de convite')]:
 edit(file,[('useRef<HTMLHeadingElement>','useRef<HTMLParagraphElement>'),(f'<h2 ref={{heading}} tabIndex={{-1}}>{title}</h2>',''),('<p role="status">{notice}</p>','<p role="status" ref={heading} tabIndex={-1}>{notice}</p>')])
for folder,file,title in [('renewal-reminders','renewal-reminders-screen','Lembretes de renovação'),('availability','availability-screen','Disponibilidade do link')]:
 p=f'frontend/src/features/{folder}/{file}.tsx'
 text=(root/p).read_text(encoding='utf-8')
 import re
 text=text.replace("import { Button } from '@/components/ui/button'", "import { BackToPanel, RefreshButton } from '@/components/layout/workspace-actions'")
 text=text.replace(f'<h2>{title}</h2>', '')
 text=re.sub(r'<div className=\{styles.actions\}><a href="/painel">Voltar ao painel</a><Button[^>]*disabled=\{state.kind === \'loading\'\} onClick=\{(.*?)\}>Atualizar dados</Button></div>', r'', text)
 # Keep secondary navigation at the end of the task, away from the page heading.
 pos=text.index('  </section>')
 text=text[:pos]+"    <div className={styles.actions}><BackToPanel /><RefreshButton disabled={state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)} /></div>\n"+text[pos:]
 (root/p).write_text(text,encoding='utf-8')
