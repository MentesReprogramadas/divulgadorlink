from pathlib import Path
import tempfile,shutil,subprocess,os,json,uuid

root=Path('C:/VSCODE/divulgadorlinks');backend=root/'backend';container='divulgador-f22-f25-validation'
database='f22_f25_proof_'+uuid.uuid4().hex[:8]
subprocess.run(['docker','exec',container,'createdb','-U','divulgador',database],check=True)
env={**os.environ,'DATABASE_URL':'postgresql://divulgador:divulgador@127.0.0.1:5835/'+database+'?schema=public'}
def sql(text):return subprocess.check_output(['docker','exec','-i',container,'psql','-v','ON_ERROR_STOP=1','-U','divulgador','-d',database,'-t','-A'],input=text,encoding='utf-8').strip()
new={'20261019130000_contact_forms','20261019140000_destination_pools','20261019150000_profile_suggestions'}
with tempfile.TemporaryDirectory(prefix='temlink-f22-f25-') as name:
 temp=Path(name);assert temp.resolve().parent==Path(tempfile.gettempdir()).resolve()
 shutil.copy2(backend/'prisma/schema.prisma',temp/'schema.prisma');(temp/'migrations').mkdir()
 shutil.copy2(backend/'prisma/migrations/migration_lock.toml',temp/'migrations/migration_lock.toml')
 for p in (backend/'prisma/migrations').iterdir():
  if p.is_dir() and p.name not in new:shutil.copytree(p,temp/'migrations'/p.name)
 def deploy():subprocess.run(['npx.cmd','prisma','migrate','deploy','--schema',str(temp/'schema.prisma')],cwd=backend,env=env,check=True)
 deploy()
 sql('''INSERT INTO tenants(id,host,name,"updatedAt") VALUES('legacy-tenant','migration-fixture.test','Legacy fixture',CURRENT_TIMESTAMP);
 INSERT INTO users(id,"tenantId",name,"passwordHash","updatedAt") VALUES('legacy-owner','legacy-tenant','Legacy owner','fixture',CURRENT_TIMESTAMP);
 INSERT INTO profiles(id,"tenantId","ownerId",slug,name,bio,version,"updatedAt") VALUES('legacy-profile','legacy-tenant','legacy-owner','legacy-page','Legacy page','Preserve this draft',3,CURRENT_TIMESTAMP);
 INSERT INTO redirect_handles(id,"tenantId","ownerId","creationKey","creationHash","updatedAt") VALUES('legacy-redirect','legacy-tenant','legacy-owner','fixture-key','fixture-hash',CURRENT_TIMESTAMP);
 INSERT INTO redirect_destinations(id,"tenantId","handleId",number,"requestKey","requestHash",label,"destinationUrl",status) VALUES('legacy-destination','legacy-tenant','legacy-redirect',1,'fixture-key','fixture-hash','Legacy invite','https://example.com/legacy','APPROVED');
 UPDATE redirect_handles SET "activeRevisionId"='legacy-destination',version=1 WHERE id='legacy-redirect';''')
 query='''SELECT json_build_object('users',(SELECT md5(row_to_json(u)::text) FROM users u WHERE id='legacy-owner'),'profile',(SELECT md5(row_to_json(p)::text) FROM profiles p WHERE id='legacy-profile'),'handle',(SELECT md5(row_to_json(h)::text) FROM redirect_handles h WHERE id='legacy-redirect'),'destination',(SELECT md5(row_to_json(d)::text) FROM redirect_destinations d WHERE id='legacy-destination'));'''
 before=sql(query)
 for p in new:shutil.copytree(backend/'prisma/migrations'/p,temp/'migrations'/p)
 deploy();after=sql(query);assert before==after
 deploy();assert sql(query)==before
 count=int(sql('SELECT count(*) FROM _prisma_migrations WHERE "finished_at" IS NOT NULL;'))
 result={'database':'disposable-local-migration-proof','migrations':count,'legacyRowsUnchanged':json.loads(after),'repeatDeployUnchanged':True,'externalDatabaseAccessed':False}
 (root/'docs/planejamento-features/evidencias-migracoes-f22-f25.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 print(json.dumps(result))
