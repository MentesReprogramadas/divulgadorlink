import subprocess
host,proof=subprocess.check_output(['docker','exec','divulgador-e2e-pg-roadmap-f10','psql','-U','divulgador','-d','divulgador','-At','-c','SELECT hostname,challenge FROM profile_hosts ORDER BY "createdAt" DESC LIMIT 1'],text=True).strip().split('|')
code="fetch('http://127.0.0.1:3500/.well-known/temlink-page/'+process.argv[2],{headers:{host:process.argv[1]+':3500'}}).then(async r=>console.log(r.status,(await r.text()).slice(0,100)))"
print(subprocess.check_output(['node','-e',code,host,proof],text=True))
