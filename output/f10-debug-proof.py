import subprocess,http.client,json
rows=subprocess.check_output(['docker','exec','divulgador-e2e-pg-roadmap-f10','psql','-U','divulgador','-d','divulgador','-At','-c','SELECT hostname,challenge FROM profile_hosts ORDER BY "createdAt" DESC LIMIT 1'],text=True).strip()
if rows:
 host,proof=rows.split('|');c=http.client.HTTPConnection('127.0.0.1',3500);c.request('GET','/.well-known/temlink-page/'+proof,headers={'Host':host+':3500'});res=c.getresponse();print(res.status,res.read(300).decode('utf-8','replace'))
 c=http.client.HTTPConnection('127.0.0.1',3833);c.request('GET','/api/v1/profile-hosts/resolve?hostname='+host+'&challenge='+proof,headers={'Host':'checklist.localhost'});res=c.getresponse();print(res.status,res.read(300).decode())
