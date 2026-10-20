from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
for name in ['backend/.env.example','frontend/.env.example']:
 p=r/name;s=p.read_text(encoding='utf-8');s+='\n# F10: raízes públicas controladas pela plataforma. Mesmo JSON no frontend/API.\n# Default desabilitado. Só configurar após DNS/proxy/certificado de staging validados.\n# Exemplo: {"paginas.temlinkaqui.com":"temlinkaqui.com"}\nPROFILE_HOST_BASES={}\n';p.write_text(s,encoding='utf-8')
