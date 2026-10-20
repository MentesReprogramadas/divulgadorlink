from pathlib import Path
import json,hashlib
r=Path('C:/VSCODE/divulgadorlinks');p=r/'docs/planejamento-features/evidencias-f10.json';data=json.loads(p.read_text(encoding='utf-8'));bad=[]
for row in data['sourceHashes']:
 if hashlib.sha256((r/row['path']).read_bytes()).hexdigest()!=row['sha256']:bad.append(row['path'])
assert not bad,bad
report=json.loads((r/'output/f10-playwright-final.json').read_text(encoding='utf-8'));assert report['stats']['expected']==21 and report['stats']['unexpected']==0 and report['stats']['skipped']==0
print('Source hashes:',len(data['sourceHashes']),'matching; E2E 21/21, no skips')
data['validationProcessExitCodes']={'frontendValidation':0,'backendValidation':0,'backendUnitsWithDisposablePix':0,'playwrightAccepted':0};p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Source snapshot persists in individual feature commits; no claim of production release.
p=r/'docs/planejamento-features/execucao-roadmap.md';s=p.read_text(encoding='utf-8');s+='''

## Entrega solicitada em 20/10/2026 — parada após F10

- 0d0a32b: snapshot de todas as alterações locais não ignoradas existentes, preservando ajustes do usuário.
- df41371: F28, comprovação de controle de domínio de destino.
- b100747: F29, eventos e calendário na página.
- dc859a9: F32, kit de divulgação com prévia e QR real.
- e2d5b8a: F33, coleções públicas com elegibilidade viva.
- F10: endereço próprio, gate TLS e isolamento; hash vinculado após commit em evidencias-f10.json.

F39 tinha somente indicação indevida no índice; foi reconciliada para não iniciada, sem implementação fictícia. O roteiro posterior permanece F24, F30, F35, F39, F26, F36, F40 e F41; nenhum foi iniciado nesta autorização. F10-M01 real e S7 continuam pendentes. Nenhum push/deploy realizado.
''';p.write_text(s,encoding='utf-8')
