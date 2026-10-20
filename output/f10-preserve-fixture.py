from pathlib import Path
import shutil
r=Path('C:/VSCODE/divulgadorlinks');out=r/'docs/frontend-profissional/evidencias/f10-2026-10-20/falha-fixture';out.mkdir(parents=True,exist_ok=True);shutil.copy2(r/'frontend/test-results/results.json',r/'output/f10-playwright-initial.json')
for d in (r/'frontend/test-results').iterdir():
 if d.is_dir() and (d/'error-context.md').exists():shutil.copytree(d,out/d.name,dirs_exist_ok=True)
p=r/'frontend/e2e/profile-hosts.spec.ts';s=p.read_text(encoding='utf-8').replace('version,"amountCents",capabilities)', 'version,"amountCents","providerPriceId","providerProductId",capabilities)').replace("'${plan}',1,1000,ARRAY[", "'${plan}',1,1000,'price_f10_fixture','prod_f10_fixture',ARRAY[");p.write_text(s,encoding='utf-8')
p=r/'backend/src/domain/access/workspace-permissions.ts';p.write_text(p.read_text(encoding='utf-8').rstrip()+'\n',encoding='utf-8')
