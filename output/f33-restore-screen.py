from pathlib import Path
import subprocess,re
r=Path('C:/VSCODE/divulgadorlinks')
p=r/'frontend/src/features/favorites/favorites-screen.tsx';s=subprocess.check_output(['git','show','HEAD:frontend/src/features/favorites/favorites-screen.tsx'],cwd=r).decode('utf-8').replace("import { FavoriteCardsSkeleton", "import {CollectionPublication} from './components/collection-publication'\nimport { FavoriteCardsSkeleton");s=s.replace('    {confirmDelete && current ?',"    {current?<CollectionPublication key={current.id} collection={current} pending={pending} onSave={mutate}/>:null}\n    {confirmDelete && current ?");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/favorites/components/collection-publication.tsx';s=p.read_text(encoding='utf-8');s=re.sub(r'<small>/colecoes/.*?</small>','',s);s=s.replace('<Field label="Endereço da coleção">','<Field label="Endereço da coleção" hint="/colecoes/seu-endereco · permanente após publicar">');p.write_text(s,encoding='utf-8')
