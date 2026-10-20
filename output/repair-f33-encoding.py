from pathlib import Path
import subprocess,re
r=Path('C:/VSCODE/divulgadorlinks')
def repair(s):
 for _ in range(3):
  result=[];i=0;changed=False
  while i<len(s):
   try:b=s[i].encode('cp1252')[0]
   except UnicodeError:b=0
   n=2 if 194<=b<=223 else 3 if 224<=b<=239 else 4 if 240<=b<=244 else 0
   if n:
    try:
     part=s[i:i+n].encode('cp1252').decode('utf-8');result.append(part);i+=n;changed=True;continue
    except UnicodeError:pass
   result.append(s[i]);i+=1
  s=''.join(result)
  if not changed:break
 return s
names=subprocess.check_output(['git','ls-files','--modified','--others','--exclude-standard','-z'],cwd=r).decode().split('\0')
for name in set(names):
 p=r/name
 if p.is_file() and p.suffix in ['.ts','.tsx','.md','.json','.prisma','.py']:
  s=p.read_text(encoding='utf-8-sig');v=repair(s)
  if s!=v:p.write_text(v,encoding='utf-8');print(name)
p=r/'frontend/src/features/favorites/public-collection.tsx';s=p.read_text(encoding='utf-8');s=re.sub(r'<EmptyState title=.*?/>','<EmptyState>Sem links disponíveis no momento.</EmptyState>',s);p.write_text(s,encoding='utf-8')
for name in ['frontend/src/features/favorites/public-collection.test.tsx','frontend/src/features/favorites/components/collection-publication.test.tsx']:
 p=r/name;s=p.read_text(encoding='utf-8');p.write_text("import '@testing-library/jest-dom/vitest'\n"+s,encoding='utf-8')
