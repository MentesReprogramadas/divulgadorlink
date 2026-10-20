from pathlib import Path
import sys,json,csv,subprocess
base=Path('C:/VSCODE/divulgadorlinks/docs/planejamento-features');feature=sys.argv[1];commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=base,text=True).strip();p=base/f'evidencias-{feature.lower()}.json';data=json.loads(p.read_text(encoding='utf-8'));data['implementationCommit']=commit;p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ['roadmap-etapas.csv','matriz-aceitacao.csv']:
 p=base/name
 with p.open(encoding='utf-8',newline='') as f:r=csv.DictReader(f);fields=r.fieldnames;rows=list(r)
 for row in rows:
  if row['feature']==feature:row['commit']=commit
 with p.open('w',encoding='utf-8',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
p=base/f'execucao-{feature.lower()}.md';s=p.read_text(encoding='utf-8');s+='\nCommit de implementação: '+commit+'.\n';p.write_text(s,encoding='utf-8')
