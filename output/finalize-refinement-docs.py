from pathlib import Path
import csv,json,shutil
root=Path('C:/VSCODE/divulgadorlinks')
base=root/'docs/planejamento-features'
results=root/'frontend/test-results/results.json'
data=json.loads(results.read_text(encoding='utf-8'))
stats=data['stats']
assert stats['unexpected']==0 and stats['expected']==37 and stats['skipped']==0, stats
shutil.copy2(results,root/'output/workspace-refinement-playwright-final.json')
p=base/'refinamento-f05-f15-f20-f21-f38.md'
s=p.read_text(encoding='utf-8')
s=s.replace('Playwright e PostgreSQL: fechamento dos resultados abaixo após a última execução. As repetições não representam casos adicionais. Falhas encontradas permanecem nos logs, com correções e nova execução dos cenários afetados.', '''PostgreSQL real: 46/46 em cinco arquivos (workspace-team, profile-team, profile-export, campaign-pages e media-kit), incluindo revogação, tenant, concorrência e importação; log output/workspace-refinement-pg-delivery.log.

Playwright final: 37/37 em desktop/mobile (loading-layout, niche-follows, profile-export e workspace-team), log output/workspace-refinement-e2e-final-verified.log. Campanhas e apresentação também passaram na rodada closure, nos dois viewports. Rodada ampla anterior: 87/89, com duas falhas da entrada administrativa de colaborador USER corrigidas no middleware e revalidadas na rodada final. Rodada closure: 30/35; quatro falhas eram asserções antigas do teste de carregamento após separar as páginas; uma era falta de aguardar o retorno ao espaço próprio antes de consultar a API. Corrigidas e repetidas com sucesso. Uma tentativa intermediária foi interrompida durante o teste antigo; outra durante o build. Não contabilizar tentativas ou somar rodadas como casos distintos.

Inspeção das capturas encontrou um rótulo quebrado no controle de permissões em mobile; encurtado para Tudo no grupo atual e revalidado no navegador e no teste unitário do editor. Primitivas, regras comerciais, permissões e opt-in não foram substituídos por estado visual.''')
p.write_text(s,encoding='utf-8')
for folder in ['specs','planos']:
 for feature in ['f05-seguir-nichos','f15-pagina-campanha','f20-equipe-permissoes','f21-midia-kit','f38-exportacao-perfil']:
  p=base/folder/(feature+'.md');s=p.read_text(encoding='utf-8').replace('Estado da ampliação: validação local em andamento; não equivale a liberação em produção.', 'Estado da ampliação: implementada e validada localmente; S7/CI/liberação remotas continuam em revisão.')
  p.write_text(s,encoding='utf-8')
p=base/'README.md';s=p.read_text(encoding='utf-8').replace('Ampliação em validação local; sem executar F22.', 'Ampliação implementada e validada localmente; S7 remoto em revisão; sem executar F22.')
p.write_text(s,encoding='utf-8')
features={'F05','F15','F20','F21','F38'}
for filename,count in [('roadmap-etapas.csv',336),('matriz-aceitacao.csv',226)]:
 p=base/filename
 with p.open(encoding='utf-8',newline='') as f:r=csv.DictReader(f);fields=r.fieldnames;rows=list(r)
 assert len(rows)==count,(filename,len(rows))
 for row in rows:
  if row['feature'] not in features:continue
  for field,addition in [('evidencia','refinamento-f05-f15-f20-f21-f38.md'),('execucao','refinamento local 19/10/2026')]:
   if addition not in row[field]:row[field]+='; '+addition
  if 'resultado' in row:row['resultado']+='; ampliação local: 382 frontend / 575 backend / 46 PG / 37 E2E finais; CI remoto pendente'
  elif row['etapa'].endswith('S6'):row['aceite']+='; refinamento local validado; sem commit/push/deploy'
 with p.open('w',encoding='utf-8',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
for name in ['execucao-f05.md','execucao-f15.md','execucao-f20.md','execucao-f21.md','execucao-f38.md']:
 p=base/name;s=p.read_text(encoding='utf-8');s+='\nResultado da ampliação: lint/typecheck/build dos dois pacotes aprovados; 382 testes frontend, 575 backend, 46 PostgreSQL e 37 Playwright finais aprovados. Capturas/hash, falhas corrigidas, alternativas e roteiro manual no refinamento vinculado. Não somar rodadas. S7 remoto permanece em revisão.\n';p.write_text(s,encoding='utf-8')
print('Documentos e matrizes fechados; 336 etapas / 226 critérios preservados.')
