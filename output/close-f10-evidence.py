from pathlib import Path
import csv,json,hashlib,shutil
r=Path('C:/VSCODE/divulgadorlinks');base=r/'docs/planejamento-features';ev=r/'docs/frontend-profissional/evidencias/f10-2026-10-20';checks=ev/'checks';checks.mkdir(parents=True,exist_ok=True)
files=['f10-all-unit-final.log','f10-backend-all-unit-final.log','f10-pg-final.log','f10-pg-billing.log','f10-backend-lint-final.log','f10-backend-typecheck-final.log','f10-backend-build-final.log','f10-frontend-lint-final.log','f10-frontend-typecheck-final.log','f10-e2e-accepted.log','f10-e2e-final.log','f10-queryplans.log','f10-domain-red.log']
records=[]
for name in files:
 p=r/'output'/name;target=checks/(p.stem+'.txt');shutil.copy2(p,target);records.append({'path':str(target.relative_to(r)).replace('\\','/'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
# The harness only starts the server after a successful production build.
p=r/'frontend/e2e/.runtime/server.log';target=checks/'harness-build-and-runtime.txt';shutil.copy2(p,target);records.append({'path':str(target.relative_to(r)).replace('\\','/'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
p=base/'evidencias-f10.json';e=json.loads(p.read_text(encoding='utf-8'));e.update(checks=records,wideRegression={'report':'output/f10-playwright-wide.json','passed':72,'failed':5,'resolution':'Old selectors/expectations fixed; complete affected scenarios rerun in final accepted report. Counts overlap; do not sum.'},manualGate={'id':'F10-M01','criterion':'F10-AC03','status':'PENDING','reason':'Real staging DNS/certificate/HTTPS not executed; local composition does not prove public TLS.'},S7='Real staging TLS/DNS, CI and remote release pending');p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=base/'matriz-aceitacao.csv'
with p.open(encoding='utf-8',newline='') as f:reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
for row in rows:
 if row['feature']=='F10' and row['criterio']=='F10-AC03':row.update(status='PARCIAL LOCAL',resultado='PENDING F10-M01: DNS/HTTPS/certificado real em staging não executado; gate local fecha em falha')
with p.open('w',encoding='utf-8',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
p=base/'roadmap-etapas.csv'
with p.open(encoding='utf-8',newline='') as f:reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
for row in rows:
 if row['feature']=='F10':
  row['ambiente']='PG/Redis descartáveis; Chromium desktop/mobile; certificado público não validado'
  if row['etapa'].endswith('S7'):row['bloqueio']='F10-M01 TLS/DNS real em staging; CI/liberação remota pendentes'
  row['aceite']='Automação local comprovada; AC03 parcial até F10-M01. Sequência S1 de componentes com ressalva documentada.'
with p.open('w',encoding='utf-8',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
p=base/'README.md';s=p.read_text(encoding='utf-8');s=s.replace('F10 validada localmente;', 'F10 implementada e testada localmente; AC03/TLS real e S7 pendentes;');s='\n'.join(line.replace('S0–S6 LOCAL; S7 EM REVISÃO','S0–S6 LOCAL; TLS/S7 PENDENTES') if '| F10 |' in line else line for line in s.splitlines())+'\n';p.write_text(s,encoding='utf-8')
p=base/'specs/f10-pagina-premium-subdominio.md';s=p.read_text(encoding='utf-8').replace('IMPLEMENTADA E VALIDADA LOCALMENTE; S7 EM REVISÃO.','IMPLEMENTADA LOCALMENTE; AC03/TLS REAL E S7 PENDENTES.');s+='\nF10-M01 obrigatório: certificado/DNS/HTTPS reais em staging não executados. A matriz mantém AC03 parcial; a composição HTTP descartável não é aceite desse gate. [Roteiro operacional](../operacao-f10.md).\n';p.write_text(s,encoding='utf-8')
p=base/'planos/f10-pagina-premium-subdominio.md';s=p.read_text(encoding='utf-8');s+='\nFechamento local: testes e contratos reconciliados na execução F10; a lista original permanece como planejamento histórico. Não marcar o check global de ACs/manual como aprovado: AC03 depende de F10-M01 real em staging, ainda pendente. Componentes testados após a composição, sem red prévio registrado; desvio de sequência S1 explícito. Parada após F10 solicitada pelo usuário.\n';p.write_text(s,encoding='utf-8')
for filename in ['roadmap-auditavel.md','execucao-roadmap.md','ordem-de-entrega.md']:
 p=base/filename;s=p.read_text(encoding='utf-8');s+='\n\n### Fechamento F10 — limite da validação\n\nImplementação/automação locais concluídas, AC03 parcial e F10-M01 (TLS/DNS real em staging) pendente. CI/deploy não executados. Parada solicitada após F10: não iniciar F24. [Operação e reversão](operacao-f10.md).\n';p.write_text(s,encoding='utf-8')
p=base/'execucao-f33.md';s=p.read_text(encoding='utf-8');s+='\nRevisão de fechamento da F10: o negativo de FK passou a exigir P2003 com favorito realmente pertencente a outro tenant, sem depender de colisão de chave primária; F33 cinco PG e seis jornadas E2E desktop/mobile passaram novamente. Skeleton público usa o card orgânico sem ações privadas/contador, com CSS Module. Provas e hash do delta vinculados à execução F10.\n';p.write_text(s,encoding='utf-8')
print('Checks preserved:',len(records),'TLS real remains pending')
