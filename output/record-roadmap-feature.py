from pathlib import Path
import csv,json,hashlib,shutil,subprocess,sys,re
root=Path('C:/VSCODE/divulgadorlinks');base=root/'docs/planejamento-features'
feature,slug,title,count,next_features=sys.argv[1:6];count=int(count)
report=root/'frontend/test-results/results.json';data=json.loads(report.read_text(encoding='utf-8'));assert data['stats']['unexpected']==0 and data['stats']['skipped']==0,data['stats']
shutil.copy2(report,root/f'output/{feature.lower()}-playwright-final.json')
out=root/f'docs/frontend-profissional/evidencias/{feature.lower()}-2026-10-20';out.mkdir(parents=True,exist_ok=True)
for p in (root/'frontend/test-results').rglob('*.png'):
 if p.name=='test-failed-1.png':continue
 shutil.copy2(p,out/(('mobile-' if 'features-mobile' in p.parent.name else 'desktop-')+p.name))
(out/'capturas.json').write_text(json.dumps([{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('*.png'))],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
text=(root/f'output/{feature.lower()}-execution-draft.md').read_text(encoding='utf-8-sig');(base/f'execucao-{feature.lower()}.md').write_text(text,encoding='utf-8')
for folder in ['specs','planos']:
 p=base/folder/(slug+'.md');s=p.read_text(encoding='utf-8').replace('SPEC PROPOSTA; implementação NÃO INICIADA.','IMPLEMENTADA E VALIDADA LOCALMENTE; S7 EM REVISÃO.').replace('NÃO INICIADO. Somente planejamento autorizado.','IMPLEMENTADO LOCALMENTE; S7 remoto em revisão.');s='\n'.join(line.rstrip() if line.startswith('**Estado:**') else line for line in s.splitlines())+'\n';s+=f'\n\n## Execução autorizada — 20/10/2026\n\n[Contrato reconciliado, decisões, ACs, testes e reversão](../execucao-{feature.lower()}.md). O registro de execução prevalece sobre caminhos/contratos apenas propostos neste planejamento. S7 remoto permanece pendente.\n';p.write_text(s,encoding='utf-8')
p=base/'README.md';s=p.read_text(encoding='utf-8');s=re.sub(r'\*\*Situação atual[^\n]+',f'**Situação atual — 20/10/2026:** {count}/42 implementações registradas. {feature} validada localmente; próxima sequência {next_features}. F39 não iniciada, corrigida a divergência do índice. S7/CI/liberação remotas pendentes. Commits na branch codex/roadmap-f37-testes; sem push/deploy. [Execução {feature}](execucao-{feature.lower()}.md).',s,count=1);line=next(line for line in s.splitlines() if '| '+feature+' |' in line);s=s.replace(line,line.replace('NÃO INICIADA','S0–S6 LOCAL; S7 EM REVISÃO'));p.write_text(s,encoding='utf-8')
for filename in ['roadmap-auditavel.md','ordem-de-entrega.md','execucao-roadmap.md']:
 p=base/filename;s=p.read_text(encoding='utf-8')
 if filename=='roadmap-auditavel.md':s='\n'.join(line.replace('NÃO INICIADA','EM REVISÃO' if '| '+feature+'-S7 |' in line else 'CONCLUÍDA LOCALMENTE') if '| '+feature+'-S' in line else line for line in s.splitlines())+'\n'
 s+=f'\n\n## 20/10/2026 — {feature} validada localmente\n\n[{title}: contrato, ACs, decisões e provas](execucao-{feature.lower()}.md). {count}/42 implementações registradas. Próxima sequência {next_features}; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.\n';p.write_text(s,encoding='utf-8')
for filename in ['roadmap-etapas.csv','matriz-aceitacao.csv']:
 p=base/filename
 with p.open(encoding='utf-8',newline='') as f:r=csv.DictReader(f);fields=r.fieldnames;rows=list(r)
 for row in rows:
  if row['feature']!=feature:continue
  row.update(responsavel='Codex',execucao='2026-10-20 local',evidencia=f'execucao-{feature.lower()}.md; evidencias-{feature.lower()}.json',commit='hash registrado após commit')
  if 'estado' in row:row.update(estado='EM REVISÃO' if row['etapa'].endswith('S7') else 'CONCLUÍDA LOCALMENTE',ambiente='PG descartável e Chromium desktop/mobile',comando=f'ver execucao-{feature.lower()}.md',exit_code='' if row['etapa'].endswith('S7') else '0',bloqueio='CI/liberação remota pendentes' if row['etapa'].endswith('S7') else '',aceite='Critérios locais comprovados; S7 remoto pendente')
  else:row.update(status='VERIFICADO LOCALMENTE',resultado='APROVADO LOCAL; S7 pendente')
 with p.open('w',encoding='utf-8',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
files=subprocess.check_output(['git','ls-files','--modified','--others','--exclude-standard','-z'],cwd=root).decode().split('\0');files=sorted(set(name for name in files if name.startswith(('backend/src/','frontend/src/','frontend/e2e/','backend/prisma/')) and (root/name).is_file() and Path(name).suffix in ['.ts','.tsx','.sql','.prisma','.css']))
evidence={'feature':feature,'date':'2026-10-20','baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'branch':'codex/roadmap-f37-testes','e2eStats':data['stats'],'report':f'output/{feature.lower()}-playwright-final.json','captures':str((out/'capturas.json').relative_to(root)).replace('\\','/'),'execution':f'execucao-{feature.lower()}.md','S7':'CI/remote release pending','sourceHashes':[{'path':name,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()} for name in files]}
(base/f'evidencias-{feature.lower()}.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(feature,'recorded',data['stats'])
