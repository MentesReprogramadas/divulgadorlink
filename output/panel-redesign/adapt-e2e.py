from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks/frontend')
for file in ['e2e/catalog.spec.ts','e2e/evolution-moderation.spec.ts','e2e/submit-link.spec.ts']:
 p=root/file;s=p.read_text(encoding='utf-8')
 # Limit changes to creation blocks; editing continues to use its existing contract.
 lines=s.splitlines(); active=False; out=[]; block=[]
 for line in lines:
  if "getByLabel('Titulo'" in line and '.fill(' in line:
   active=True;block=[line.replace("'Titulo'","'Título do link'")];continue
  if active:
   block.append(line)
   if "getByRole('button', { name: 'Enviar'" in line:
    url=[l.replace("'URL'","'Link de acesso'") for l in block if "getByLabel('URL'" in l and '.fill(' in l]
    desc=[l for l in block if "getByLabel('Descrição'" in l and '.fill(' in l]
    facets=[l.replace("'Rede'","'Rede do link'").replace("'Nicho'","'Assunto do link'") for l in block if "getByLabel('Rede'" in l or "getByLabel('Nicho'" in l]
    if file.endswith('submit-link.spec.ts') and any('reload()' in l for l in block):
     # Exercise persistence across steps and reloads, with no publish request yet.
     out += [block[0],url[0],"  await page.getByRole('button', { name: 'Continuar', exact: true }).click()",desc[0], '  await page.reload()',"  await expect(page.getByLabel('Título do link')).toHaveValue('Rascunho do anúncio')","  await page.getByRole('button', { name: 'Continuar', exact: true }).click()","  await expect(page.getByLabel('Descrição')).toHaveValue('Texto que precisa voltar')"]+facets+["  await page.getByRole('button', { name: 'Continuar', exact: true }).click()",line]
    else: out += [block[0]]+url+["  await page.getByRole('button', { name: 'Continuar', exact: true }).click()"]+desc+facets+["  await page.getByRole('button', { name: 'Continuar', exact: true }).click()",line]
    active=False;block=[]
  else:out.append(line)
 if block: raise Exception('Unclosed '+file)
 s='\n'.join(out)+'\n'
 # The draft test's URL variable must exist before the first fill.
 if file.endswith('submit-link.spec.ts'):
  s=s.replace("  await page.getByLabel('Título do link').fill('Rascunho do anúncio')", "  const url = `https://example.com/envio-${Date.now()}`\n  await page.getByLabel('Título do link').fill('Rascunho do anúncio')",1)
 p.write_text(s,encoding='utf-8')
