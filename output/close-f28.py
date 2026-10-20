from pathlib import Path
import json,shutil,hashlib,csv,subprocess
root=Path('C:/VSCODE/divulgadorlinks');base=root/'docs/planejamento-features';results=root/'frontend/test-results';data=json.loads((results/'results.json').read_text(encoding='utf-8'));assert data['stats']['expected']==7 and data['stats']['unexpected']==0
shutil.copy2(results/'results.json',root/'output/f28-playwright-final.json')
out=root/'docs/frontend-profissional/evidencias/f28-2026-10-20';out.mkdir(parents=True,exist_ok=True)
for p in results.rglob('*.png'):shutil.copy2(p,out/(('mobile-' if 'features-mobile' in p.parent.name else 'desktop-')+p.name))
(out/'capturas.json').write_text(json.dumps([{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('*.png'))],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
text='''# F28 — Comprovação do domínio do destino

20/10/2026. Implementação local na branch existente codex/roadmap-f37-testes, após checkpoint 0d0a32b. Sem push/deploy. F39 corrigida para NÃO INICIADA: não havia implementação ou prova de execução, apenas uma marcação isolada no índice.

## Contrato e reuso

Convites → abrir endereço → Controle do domínio → Comprovar domínio. O modal explica criar/publicar/verificar arquivo HTTPS. Prova vinculada ao tenant, titular, destino e revisão F12. Reutiliza BFF, sessão/CSRF, permissões invitations, RedirectRequest, safeFetch com DNS fixado e limites, AuditLog, Badge, Field, OverlayDialog e skeleton. Novo OwnershipPanel coordena somente esta jornada. Projeção pública allowlist e página SSR /verificacao/:id, sem desafio, hash, IDs privados ou cookies de autenticação encaminhados ao endpoint público (somente age).

D30 e alternativas em decisoes.md. Arquivo em /.well-known/temlinkaqui-verification.txt, desafio aleatório de 32 bytes por 30 minutos, hash SHA256 persistido, no máximo cinco criações por hora/endereço. Comprovação por 30 dias; renovar cria outro desafio. Retenção 180 dias reaproveita purgeRedirectHistory. Arquivo sem redirects: não aceitar prova servida por outro domínio. Redes hospedadas não recebem método fictício; e-mail confirmado não comprova comunidade. Selo confirma somente controle do domínio, sem endosso de identidade, segurança ou qualidade.

Referência de procedimento: [Google Site Verification](https://developers.google.com/site-verification/v1/getting_started), fundamento de arquivo com token e conferência antes do selo; não integra Google nem copia sua identidade visual. A composição mantém os padrões do painel existentes. Refero indisponível conforme ferramentas.md.

## Persistência e segurança

Migration expansiva ownership_challenges, FK composta handle/tenant/owner, hash restrito, datas coerentes e evidência dependente de consumo. Sem backfill ou alteração de registros antigos. Trigger BEFORE UPDATE do handle revoga desafios/evidências em mudança de revisão, titular ou desativação, inclusive aprovação humana por outro fluxo. Projeção ainda confere esses vínculos e validade como segunda proteção. Verificação externa fora da transação; reconferência de destino/relógio, consumo condicional e AuditLog dentro da mesma transação impedem duas verificações concorrentes. Rejeição de conteúdo preserva desafio para correção. Revogação explícita exige confirmação.

## Aceitação executada

| Critério | Evidência |
| --- | --- |
| AC01/T01 | Conta confirmada sem selo; redes sem método; público lê escopo domínio; PG, domínio e E01/E02 |
| AC02/T02 | Desafio 30min, validade 30d, revalidação e expiração; PG/U/E02 |
| AC03/T03 | Troca de URL/revisão/titular e revogação invalidam; trigger PG e E01/E03 |
| AC04/T04 | Somente hash, uma consumação concorrente, auditoria, limite e retenção; PG e E02 |

Backend: 600 casos passaram na rodada geral, dois testes Pix falharam por schema desatualizado no banco padrão do teste; ambos repetidos e aprovados no PG/Redis descartável explícito. Portanto 602 casos aprovados considerando a repetição dos dois afetados, sem fingir uma rodada única verde. Frontend completo 438/438; domínio/adapter novos fazem parte da rodada backend. PostgreSQL inicial ownership+redirects 20/20; ampliação ownership final 7/7, incluindo colaborador e FK/titular. Playwright final 7/7 (desktop/mobile), mais build de produção do harness. Lint/typecheck de ambos e build backend aprovados. Query plan registrado: tabela pequena usa seq scan; índices alinhados à consulta por tenant/handle e retenção, sem alegação de ganho de desempenho.

Logs em output/f28-*.log; relatório output/f28-playwright-final.json; capturas e hashes em docs/frontend-profissional/evidencias/f28-2026-10-20. Inspeção direta: modal desktop e estado verificado mobile. Corrigido artefato de captura fullPage com backdrop nativo: captura final do diálogo usa viewport. Teclado Enter, erro recuperável preservando token, 320px/200%, escopo público Axe e ausência de token no HTML foram verificados. Não certifica acessibilidade global nem aparelho físico.

S1: testes negativos exercitados; a execução vermelha anterior à implementação não foi preservada, portanto não é declarada como executada. Desvio de processo registrado, sem inventar evidência retrospectiva. S7/CI e liberação remota permanecem em revisão.

## Operação e reversão

Sem env nova obrigatória; adapter usa HTTPS público e isolamento existente. Stub de arquivo restrito a NODE_ENV=dev, host example.com e origem localhost, somente no harness. Nenhum envio ou cobrança real. Migrations precisam ser aplicadas no ambiente autorizado. Para reverter, retirar endpoints/painel novos, preservando tabela/evidências para auditoria; não resetar alterações locais. Não aplicar migration destrutiva automaticamente. A infraestrutura descartável é encerrada no fechamento desta sequência.

Próxima F29, conforme autorização até F10; F39 permanece fora da sequência.
'''
(base/'execucao-f28.md').write_text(text,encoding='utf-8')
for folder in ['specs','planos']:
 p=base/folder/'f28-comprovacao-propriedade.md';s=p.read_text(encoding='utf-8');s=s.replace('SPEC PROPOSTA; implementação NÃO INICIADA.','IMPLEMENTADA E VALIDADA LOCALMENTE; S7 EM REVISÃO.').replace('NÃO INICIADO. Somente planejamento autorizado.','IMPLEMENTADO LOCALMENTE. S7 remoto em revisão.');s+='\n\n## Execução autorizada — 20/10/2026\n\n[Contrato reconciliado, decisões, ACs, testes, desvio S1, evidências e reversão](../execucao-f28.md). Rotas usam /me/redirects/:id/ownership, recurso F12 existente; origem web e validade D30 resolvidas. Não repetir a proposta antiga como contrato implementado. Checklist original preservado como planejamento; conclusão comprovada pelo registro de execução, sem marcar liberação remota.\n';p.write_text(s,encoding='utf-8')
p=base/'README.md';s=p.read_text(encoding='utf-8');s=s.replace('**Situação atual — 19/10/2026:** 29/42 implementações nos ambientes declarados. F22, F23 e F25 verificadas localmente nesta sequência; parada atendida após o assistente. Restam 13 implementações; próxima F28, não iniciada.', '**Situação atual — 20/10/2026:** 30/42 implementações nos ambientes declarados. F28 validada localmente; execução autorizada segue F29 → F32 → F33 → F10 e para após F10. Restam 12 implementações; F39 permanece não iniciada, corrigida a divergência do índice.');line=next(x for x in s.splitlines() if '| F28 |' in x);s=s.replace(line,line.replace('NÃO INICIADA','S0–S6 LOCAL; S7 EM REVISÃO'));p.write_text(s,encoding='utf-8')
for filename in ['roadmap-auditavel.md','ordem-de-entrega.md','execucao-roadmap.md']:
 p=base/filename;s=p.read_text(encoding='utf-8');
 if filename=='roadmap-auditavel.md':
  lines=s.splitlines();s='\n'.join(line.replace('NÃO INICIADA','EM REVISÃO' if '| F28-S7 |' in line else 'CONCLUÍDA LOCALMENTE') if '| F28-S' in line else line for line in lines)+'\n'
 s+='\n\n## 20/10/2026 — F28 concluída localmente\n\n[Execução, decisões e provas](execucao-f28.md). Checkpoint inicial 0d0a32b preservou todas as alterações locais. F39 corrigida para não iniciada. 30/42 implementações locais; próximo F29 → F32 → F33 → F10 por autorização vigente, sem parar na primeira feature. S7 remoto em revisão; sem push/deploy.\n';p.write_text(s,encoding='utf-8')
for filename in ['roadmap-etapas.csv','matriz-aceitacao.csv']:
 p=base/filename
 with p.open(encoding='utf-8',newline='') as f:r=csv.DictReader(f);fields=r.fieldnames;rows=list(r)
 for row in rows:
  if row['feature']!='F28':continue
  row['responsavel']='Codex';row['execucao']='2026-10-20 local';row['evidencia']='execucao-f28.md; evidencias-f28.json';row['commit']='implementação local; hash registrado após commit'
  if 'estado' in row:row.update(estado='EM REVISÃO' if row['etapa'].endswith('S7') else 'CONCLUÍDA LOCALMENTE',ambiente='PG/Redis descartáveis e Chromium desktop/mobile',comando='ver execucao-f28.md',exit_code='' if row['etapa'].endswith('S7') else '0',bloqueio='CI/liberação remota pendentes' if row['etapa'].endswith('S7') else '',aceite='ACs locais comprovados; registro red de S1 não preservado; S7 remoto pendente')
  else:row.update(status='VERIFICADO LOCALMENTE',resultado='APROVADO LOCAL; S7 pendente; 7 PG e 7 E2E finais')
 with p.open('w',encoding='utf-8',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
files=[str(p.relative_to(root)).replace('\\','/') for p in (root/'backend/src/domain/verification').glob('*.ts')]+['backend/src/repositories/ownership.ts','backend/src/adapters/http/ownership-fetch.ts','backend/src/http/ownership.pg.spec.ts','frontend/src/features/ownership/ownership-panel.tsx','frontend/e2e/ownership.spec.ts','backend/prisma/migrations/20261020080000_ownership_challenges/migration.sql']
evidence={'feature':'F28','date':'2026-10-20','baseCommit':'0d0a32b','branch':'codex/roadmap-f37-testes','frontendUnits':438,'backendGeneral':{'passed':600,'failed':2,'repeatedPassed':2,'reason':'old default Pix proof database lacked emailDigest; rerun on explicit disposable PG/Redis'},'pgFinal':7,'redirectsAndOwnershipInitial':20,'e2eStats':data['stats'],'e2eReport':'output/f28-playwright-final.json','captures':'docs/frontend-profissional/evidencias/f28-2026-10-20/capturas.json','gates':{'local':'validated','S7':'remote pending','initialRed':'not preserved'},'sourceHashes':[{'path':name,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()} for name in files]}
(base/'evidencias-f28.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=root/'docs/frontend-profissional/icones-e-navegacao.md';s=p.read_text(encoding='utf-8');s+='\n\nF28: domainOwnership identifica controle do domínio (janela web com confirmação), distinto de confirmação de e-mail, equipe e moderação. Reutilizado no título/ação somente para esse significado. Revogar usa a ação disable já existente.\n';p.write_text(s,encoding='utf-8')
print('F28 documentation and evidence complete')
