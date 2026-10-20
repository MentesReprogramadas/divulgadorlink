from pathlib import Path
import shutil,hashlib,json
root=Path('C:/VSCODE/divulgadorlinks')
out=root/'docs/frontend-profissional/evidencias/refinamento-roadmap-2026-10-19'
manifest=out/'capturas.json'
records={x['file']:x for x in json.loads(manifest.read_text(encoding='utf-8'))}
names={'campaign-source-preview.png','kit-management.png','kit-public.png','granular-permissions.png','workspace-editor.png','global-team-empty.png','delegated-admin-readonly.png','digest-active-card.png','digest-disabled-card.png','import-confirmation.png','painel-perfil-loading.png','painel-perfil-ready.png','painel-perfil-links-loading.png','painel-perfil-links-ready.png'}
for p in (root/'frontend/test-results').rglob('*.png'):
 if p.name not in names: continue
 name=('mobile-' if 'features-mobile' in p.parent.name else 'desktop-')+p.name
 shutil.copy2(p,out/name)
 records[name]={'file':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'source':p.parent.name}
manifest.write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(records)} capturas preservadas')
