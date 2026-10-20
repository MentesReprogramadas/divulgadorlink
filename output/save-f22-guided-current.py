from pathlib import Path
import json,hashlib,shutil,sys
root=Path('C:/VSCODE/divulgadorlinks')
mode=sys.argv[1]
source=root/'frontend/test-results'
report=json.loads((source/'results.json').read_text(encoding='utf-8'))
shutil.copy2(source/'results.json',root/f'output/f22-f25-guided-playwright-{mode}.json')
folder=root/'docs/frontend-profissional/evidencias/f22-f25-guiado-2026-10-19'/('final' if mode=='centered' else 'ampliada')
folder.mkdir(parents=True,exist_ok=True)
for p in source.rglob('*.png'):
 if p.name=='test-failed-1.png':continue
 prefix='mobile-' if 'features-mobile' in str(p.parent) else 'desktop-'
 shutil.copy2(p,folder/(prefix+p.name))
for p in source.rglob('error-context.md'):
 dest=folder/'falhas'/p.parent.name
 dest.mkdir(parents=True,exist_ok=True)
 shutil.copy2(p,dest/p.name)
 if (p.parent/'trace.zip').exists():shutil.copy2(p.parent/'trace.zip',dest/'trace.zip')
records=[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(folder.glob('*.png'))]
(folder/'capturas.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report['stats']))
print(len(records),'captures',folder)
