from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
p=r/'frontend/src/features/profiles/profile-appearance.ts';s=p.read_text(encoding='utf-8').replace('const allowed = { backgroundStyle:',"const allowed = { coverStyle:['none','banner'],backgroundStyle:");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/profiles/profile-comparison.ts';s=p.read_text(encoding='utf-8').replace("{ solid:","{none:'Sem capa',banner:'Faixa do tema', solid:").replace("const labels = { searchEnabled:","const labels = { coverStyle:'Capa da página',searchEnabled:");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/middleware.test.ts';s=p.read_text(encoding='utf-8').replace("describe('middleware', async () =>", "describe('middleware', () =>");p.write_text(s,encoding='utf-8')
p=r/'backend/src/repositories/profile-hosts.ts';s=p.read_text(encoding='utf-8').replace('profileHostBases,profileHostname','profileHostBases,profileHostname,profileHostCovered').replace("row.status==='RETIRED'||!enabled?", "row.status==='RETIRED'||!profileHostCovered(enabled,Boolean(row.profile.publication),Boolean(row.tlsVerifiedAt))?");p.write_text(s,encoding='utf-8')
