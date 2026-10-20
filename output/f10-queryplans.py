import subprocess
queries=[('F33 lookup tenant/slug','EXPLAIN (ANALYZE,BUFFERS) SELECT id FROM collections WHERE "tenantId"=\'fixture-absent\' AND slug=\'fixture-absent\''),('F10 exact hostname','EXPLAIN (ANALYZE,BUFFERS) SELECT hostname,status,"profileId" FROM profile_hosts WHERE hostname=\'fixture-absent.pages.test\''),('F10 owned hosts','EXPLAIN (ANALYZE,BUFFERS) SELECT hostname,version FROM profile_hosts WHERE "tenantId"=\'fixture-absent\' AND "profileId"=\'fixture-absent\' ORDER BY version DESC')]
with open('C:/VSCODE/divulgadorlinks/output/f10-queryplans.log','w',encoding='utf-8') as f:
 for label,query in queries:
  value=subprocess.check_output(['docker','exec','tla-f28-20261020','psql','-U','fixture','-d','roadmap','-c',query],text=True);f.write(label+'\n'+value+'\n')
