from pathlib import Path
import shutil
r=Path('C:/VSCODE/divulgadorlinks');out=r/'docs/frontend-profissional/evidencias/f33-2026-10-20/falha-inicial';out.mkdir(parents=True,exist_ok=True);shutil.copy2(r/'frontend/test-results/results.json',r/'output/f33-playwright-initial.json')
for d in (r/'frontend/test-results').iterdir():
 if d.is_dir() and (d/'error-context.md').exists():shutil.copytree(d,out/d.name,dirs_exist_ok=True)
p=r/'frontend/e2e/public-collections.spec.ts';s=p.read_text(encoding='utf-8');s=s.replace("const response=await visitor.goto(roadmapOrigin+'/colecoes/'+f.slug);expect(response?.status()).toBe(404)","expect((await roadmapApi(visitor,'/collections/'+f.slug)).status).toBe(404);await visitor.goto(roadmapOrigin+'/colecoes/'+f.slug);await expect(visitor.getByRole('heading',{name:'Não encontrado',exact:true})).toBeVisible();expect(await visitor.content()).not.toContain('Comunidade pública')");p.write_text(s,encoding='utf-8')
