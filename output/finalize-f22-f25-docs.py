from pathlib import Path
import csv,io,json,re

root=Path('C:/VSCODE/divulgadorlinks')
docs=root/'docs/planejamento-features'
features={
 'F22':('f22-formulario-contato','Formulário de contato','D24','contact-forms','leads/contact-form','contact-forms'),
 'F23':('f23-distribuidor-convites','Distribuidor de convites','D25','destination-pools','redirects/destination-pool','redirect-pools'),
 'F25':('f25-assistente-perfil','Assistente de criação da página','D27','profile-assistant','profiles/profile-suggestion','profile-assistant'),
}
contracts={
 'F22':'''Configuração: GET/PUT /api/v1/me/forms, versão esperada; leitura paginada e CSV da página atual em /me/forms/submissions e /export; DELETE por resposta. Público: GET /profiles/:slug/contact-form e POST /submissions, revisão e UUID de idempotência. Campos fixos nome/e-mail/telefone/empresa/mensagem, ao menos um contato obrigatório. Formulário aparece somente em página publicada elegível; prévia não envia. Respostas privadas por 180 dias, exclusão manual, preferência de novidades separada e inicialmente desmarcada. Honeypot, limite por HMAC do contato e teto por formulário. Seção global contacts, sem herança automática de page. Nenhum envio externo.''',
 'F23':'''GET/PUT/DELETE /api/v1/me/redirects/:id/pool, PATCH /pool/:revisionId para pausa/retomada. Selecionar até 20 revisões APROVADAS e ativas de convites próprios, pesos 1–100. Mesma URL /r/:id. Round-robin ponderado persistente e transacional; validação F12 ao configurar/retomar; rechecagem de elegibilidade no acesso. Sem destino válido: indisponível, sem Location/fallback silencioso. DELETE desativa a distribuição e retorna explicitamente ao convite único, preservando configuração/métricas. Agregados por destino/dia por 180 dias, HEAD/dono/admin sem contagem/avanço; F37 avança sem duplicar contagem bruta. Seção global invitations.''',
 'F25':'''GET/POST /api/v1/me/profile/suggestions; GET/DELETE /:id; POST /:id/preview e /:id/apply. Entrada: name/slug (iguais ao rascunho existente), activity, providedFacts, linkIds, linksText, expectedVersion, requestKey. Saída schemaVersion 1, provenance, validation, content e quota; aplicação devolve rascunho com versão. Campos selecionáveis bio/groups/order/appearance, bio manual e template existente opcionais. Geração/descarte não salvam página nem publicam. Aplicação transacional, idempotente e com versão esperada, preservando campos omitidos. Reutiliza parser F17, modelos F16, renderer de prévia existente e writeDraft. Porta própria de geração; não reutiliza moderação como gerador. Seção global assistant permite consultar/aplicar rascunho, sem conceder editor manual/publicação. Cinco tentativas/dia UTC, reserva técnica e tokens/custo estimado; sugestões 24h, uso agregado 180 dias. Modelo/limites/dados e alternativas em D27 no registro de execução. Chave/acesso reais da conta e cobrança do provedor não foram ensaiados.''',
}

def read(p):return p.read_text(encoding='utf-8-sig')
def write(p,s):p.write_text(s,encoding='utf-8')

for f,(slug,title,decision,e2e,domain,frontend) in features.items():
 execution='execucao-'+f.lower()+'.md'
 p=docs/'specs'/f'{slug}.md';s=read(p)
 s=s.replace('**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.','**Estado:** S0–S6 verificadas localmente em 19/10/2026; S7/CI/liberação em revisão.')
 s=s.replace('## Contratos propostos','## Contratos de referência do planejamento inicial')
 insert=f'''## Contrato concretizado em 19/10/2026

{contracts[f]}

{decision} resolvida por escolha técnica documentada, conforme autorização para decidir sem consultas rotineiras. [Execução, testes, alternativas e limites](../{execution}). Sem novo commit/push/deploy. O planejamento inicial abaixo é histórico; divergências de nomes/contrato são reconciliadas por esta seção e pelo código/testes referenciados.

'''
 s=s.replace('## Objetivo e fronteira',insert+'## Objetivo e fronteira',1);write(p,s)
 p=docs/'planos'/f'{slug}.md';s=read(p)
 s=s.replace('**Estado:** NÃO INICIADO. Somente planejamento autorizado.','**Estado:** implementado e verificado localmente até S6; S7 remoto em revisão. Parada após F25.')
 s=s.replace('Todos os itens abaixo são tarefas futuras. Não executar comandos, criar migration ou escrever aplicação só porque este plano existe.','Execução autorizada pelo pedido F22 → F23 → F25. Os requisitos abaixo foram conferidos conforme registro de execução; a existência deste plano não autoriza liberação remota.')
 # The original detailed checklist is preserved; local completion is backed by per-stage evidence.
 before,after=s.split(f'## {f}-S7',1)
 before=before.replace('- [ ]','- [x]')
 s=before+f'## {f}-S7'+after
 s=s.replace('- [ ] Executar lint/typecheck/unit/build','- [x] Executar lint/typecheck/unit/build',1)
 for prefix in [f'{f}-AC01,', 'U/C/I/E e PG/Redis/manual', 'Reuso e design revistos', 'Contratos, dados, migração']:
  s=s.replace('- [ ] '+prefix,'- [x] '+prefix)
 s=s.replace('**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.',f'**Registro atual:** responsável Codex; alterações locais sem novo commit. S0–S6 verificadas; ver [{execution}](../{execution}) e evidências JSON. S7/CI/liberação remota pendentes. Não confundir prontidão local com produção.')
 s=s.replace('## Arquivos e pontos de integração',f'''## Evidência e implementação efetiva

[Registro auditável](../{execution}). {contracts[f]}

Arquivos efetivos: backend/src/domain/{domain}.ts, backend/src/repositories/{'profile-suggestions' if f=='F25' else e2e}.ts, frontend/src/features/{frontend}/, frontend/e2e/{e2e}.spec.ts. HTTP/PG: backend/src/http/{'profile-suggestions' if f=='F25' else e2e}.pg.spec.ts. Migrations aditivas: 202610191{'30000_contact_forms' if f=='F22' else '40000_destination_pools' if f=='F23' else '50000_profile_suggestions'}. Nomes sugeridos anteriormente abaixo são referências do inventário, sem obrigação de duplicar arquivos.

Domain RED comportamental registrado, GREEN e componentes/PG/E2E reais. Casos sem fila não criam worker artificial; expurgo usa worker existente. CI e publicação não executados. Banco pessoal/ambiente externo preservados. Migrações exercitadas em bancos descartáveis; conferir/aplicar no ambiente alvo durante liberação autorizada.

## Arquivos e pontos de integração''',1)
 inventory=f'''## Arquivos e pontos de integração

- Domínio: backend/src/domain/{domain}.ts e .spec.ts.
- Persistência: backend/src/repositories/{'profile-suggestions' if f=='F25' else e2e}.ts; schema Prisma e migration aditiva.
- API: backend/src/http/controllers/{'@Profiles/suggestion-routes.ts' if f=='F25' else '@Profiles/contact-routes.ts' if f=='F22' else '@Redirects/routes.ts'}.
- UI: frontend/src/features/{frontend}/, CSS Module local, rota do painel, navegação e skeleton compartilhados.
- HTTP com PG real: backend/src/http/{'profile-suggestions' if f=='F25' else e2e}.pg.spec.ts.
- E2E: frontend/e2e/{e2e}.spec.ts nos projetos features e features-mobile.
- Reúso e lacunas concretas: consultar o registro S0 da execução, incluindo prévia/publicação existentes, F12/F16/F17 e a separação de dados pessoais ou de geração conforme a feature.

'''
 s=re.sub(r'## Arquivos e pontos de integração\n.*?(?=## '+f+r'-S0)',inventory,s,flags=re.S,count=1)
 old={'F22':'formulario-contato','F23':'distribuidor-convites','F25':'assistente-perfil'}[f]
 s=s.replace(f'backend/src/domain/{domain.rsplit("/",1)[0]}/{old}.spec.ts',f'backend/src/domain/{domain}.spec.ts')
 for suffix in ['http.spec.ts','pg.spec.ts']:s=s.replace(f'backend/src/http/{old}.{suffix}',f'backend/src/http/{"profile-suggestions" if f=="F25" else e2e}.pg.spec.ts')
 s=s.replace(f'frontend/src/components/domain/{old}.test.tsx',f'frontend/src/features/{frontend}/{"assistant-review" if f=="F25" else "contact-form" if f=="F22" else "pool-screen"}.test.tsx')
 s=s.replace(f'frontend/e2e/{old}.spec.ts',f'frontend/e2e/{e2e}.spec.ts').replace(f'e2e/{old}.spec.ts',f'e2e/{e2e}.spec.ts')
 s=s.replace('Comando futuro','Comando local').replace('PG futuro','PG local').replace('Mobile futuro','Mobile local').replace('Esses projetos são propostos, não existentes na baseline.','Ambos os projetos existentes foram usados.')
 write(p,s)

p=docs/'README.md';s=read(p);s=re.sub(r'\*\*Situação atual — 19/10/2026:\*\*[^\n]+','**Situação atual — 19/10/2026:** 29/42 implementações nos ambientes declarados. F22, F23 e F25 verificadas localmente nesta sequência; parada atendida após o assistente. Restam 13 implementações; próxima F28, não iniciada. S7/CI/liberação remotas em revisão. Sem nova branch, commit, push ou deploy. [F22](execucao-f22.md) · [F23](execucao-f23.md) · [F25](execucao-f25.md).',s,count=1)
s=s.replace('Ampliação implementada e validada localmente; S7 remoto em revisão; sem executar F22.','Ampliação anterior implementada e validada localmente. Pedido posterior implementou F22 → F23 → F25, conforme situação atual acima.')
s=s.replace('A implementação do roadmap parou após F21. O pedido atual refina F05/F15/F20/F21/F38; F22 e posteriores não foram iniciadas.','A implementação atual parou após F25. As notas datadas anteriores preservam o histórico de autorizações e paradas.')
lines=[]
for line in s.splitlines():
 if any(re.match(r'\| \d+ \| '+f+r' \|',line) for f in features):line=line.replace('NÃO INICIADA','S0–S6 LOCAIS; S7 EM REVISÃO')
 lines.append(line)
write(p,'\n'.join(lines)+'\n')

for name in ['ordem-de-entrega.md','execucao-roadmap.md','roadmap-auditavel.md']:
 p=docs/name;s=read(p)
 for f in features:
  for n in range(8):s=re.sub(r'(\| '+f+r'-S'+str(n)+r' \| )NÃO INICIADA',r'\1'+('VERIFICADA LOCAL' if n<7 else 'EM REVISÃO'),s)
 s+='''
## 19/10/2026 — sequência F22 → F23 → F25 encerrada

29/42 implementações nos ambientes declarados; 13 restantes. F22 (contatos), F23 (distribuição) e F25 (assistente) verificadas localmente até S6. Parada após F25 conforme pedido, sem iniciar F28. [F22](execucao-f22.md) · [F23](execucao-f23.md) · [F25](execucao-f25.md). S7/CI/liberação remota em revisão; não apagar pendências históricas. Sem branch, commit, push ou deploy novos; banco pessoal e ambiente externo preservados. Migrations prontas e verificadas em bancos descartáveis, ainda dependem de aplicação no ambiente alvo autorizado.
''';write(p,s)

p=docs/'decisoes.md';s=read(p)
for f,(_,_,decision,*_) in features.items():
 s=re.sub(r'(\| '+f+r' \| )([^|]+)(\| )([^\n]+)',lambda m:m[1]+m[2]+m[3]+f'Resolvida localmente em 19/10/2026; [escolhas e alternativas](execucao-{f.lower()}.md); S7 remoto pendente |',s,count=1)
s+='\nD24/D25/D27 concretizadas nesta sequência, conforme autorização para adotar a melhor escolha e documentar alternativas. A regra pública de moderação/publicação existente permanece; assistência não aprova catálogo. Parada após F25.\n';write(p,s)

for filename,total in [('roadmap-etapas.csv',336),('matriz-aceitacao.csv',226)]:
 p=docs/filename;original=read(p).splitlines(keepends=True);header=next(csv.reader([original[0]]));new=[original[0]];count=0
 for line in original[1:]:
  row=next(csv.reader([line]));count+=1
  if row[0] not in features:new.append(line);continue
  item=dict(zip(header,row));f=item['feature'];execution=f'execucao-{f.lower()}.md; evidencias-{f.lower()}.json'
  item.update(responsavel='Codex',commit='',execucao='2026-10-19; local Windows; sem novo commit',evidencia=execution)
  if filename=='roadmap-etapas.csv':
   n=int(item['etapa'][-1]);item.update(estado='VERIFICADA LOCAL' if n<7 else 'EM REVISÃO',ambiente='PG/Redis descartáveis + Next produção local + Chromium desktop/mobile',comando='Ver comandos/contagens/limites no registro de execução',exit_code='0' if n<7 else '',bloqueio='' if n<7 else 'CI e liberação remota não executados',aceite='LOCAL VERIFICADO; produção não validada' if n<7 else 'PENDENTE REMOTO')
  else:item.update(status='VERIFICADO',resultado='APROVADO LOCAL; S7 remoto em revisão')
  stream=io.StringIO();writer=csv.writer(stream,lineterminator='\n');writer.writerow([item[k] for k in header]);new.append(stream.getvalue())
 assert count==total,(filename,count);write(p,''.join(new))

print('Specs, planos, roadmap e decisões atualizados; 336 etapas e 226 critérios preservados.')
