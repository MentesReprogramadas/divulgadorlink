from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
p=r/'frontend/src/features/favorites/components/collection-publication.tsx';s=p.read_text().replace('Textarea','TextArea');p.write_text(s,encoding='utf-8')
p=r/'frontend/src/app/colecoes/[slug]/loading.tsx';s=p.read_text();import re;s=re.sub(r'style=\{\{height:(\d+),width:\'([^\']+)\'\}\}',r'height={\1} width="\2"',s);p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/favorites/favorites-screen.tsx';s=p.read_text();print([(i,repr(c)) for i,c in enumerate(s) if ord(c) in [160,65279]]);s=s.replace('\ufeff','').replace('\xa0',' ');p.write_text(s,encoding='utf-8')
