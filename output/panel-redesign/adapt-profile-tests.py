from pathlib import Path
p=Path('C:/VSCODE/divulgadorlinks/frontend/e2e/profiles.spec.ts');s=p.read_text(encoding='utf-8')
s=s.replace('async function base(page: Page) {', '''async function step(page: Page, target: number) {
  const current = await page.getByRole('list', { name: 'Etapas do formulário' }).locator('li').evaluateAll(items => items.findIndex(item => item.hasAttribute('aria-current')))
  if (target < current) await page.getByRole('list', { name: 'Etapas do formulário' }).getByRole('button').nth(target).click()
  else for (let index = current; index < target; index++) await page.getByRole('button', { name: 'Continuar', exact: true }).click()
}
async function base(page: Page) {''')
s=s.replace("  await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo 1', { exact: true }).fill('Materiais')", "  await step(page, 2); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo 1', { exact: true }).fill('Materiais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()")
s=s.replace("  const row = page.getByRole('group', { name: `Link ${index} do grupo ${group}`, exact: true })", "  const row = page.getByRole('dialog')")
s=s.replace('  return row', "  await page.getByRole('button', { name: 'Concluir link', exact: true }).click()\n  return page.getByRole('group', { name: `Link ${index} do grupo ${group}`, exact: true })")
s=s.replace(".fill('Redes sociais')", ".fill('Redes sociais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()")
s=s.replace("const social = await add(page, 2, 1, 'Vídeos');", "const socialRow = await add(page, 2, 1, 'Vídeos'); await socialRow.getByRole('button', { name: 'Editar link', exact: true }).click(); const social = page.getByRole('dialog');")
s=s.replace(".fill('https://example.com/videos')", ".fill('https://example.com/videos'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()")
s=s.replace("  for (const mime of", "  await step(page, 1)\n  for (const mime of")
s=s.replace("  await page.getByRole('button', { name: 'Subir grupo 2'", "  await step(page, 2)\n  await page.getByRole('button', { name: 'Subir grupo 2'")
s=s.replace("  await page.getByRole('button', { name: 'Ver prévia'", "  await step(page, 3)\n  await page.getByRole('button', { name: 'Ver prévia'")
s=s.replace("  await page.getByLabel('Conteúdo para maiores", "  await step(page, 1)\n  await page.getByLabel('Conteúdo para maiores")
# Every explicit persistence action is performed on the final step.
s=s.replace("await page.getByRole('button', { name: 'Publicar perfil'", "await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil'")
s=s.replace("await page.getByRole('button', { name: 'Salvar rascunho'", "await step(page, 3); await page.getByRole('button', { name: 'Salvar rascunho'")
s=s.replace("await second.getByRole('button', { name: 'Salvar rascunho'", "await step(second, 3); await second.getByRole('button', { name: 'Salvar rascunho'")
s=s.replace("await page.getByLabel('Descrição', { exact: true }).fill(text)", "await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill(text)")
s=s.replace("await page.getByLabel('Descrição', { exact: true }).fill('Gravado", "await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill('Gravado")
s=s.replace("await second.getByLabel('Descrição', { exact: true }).fill('Rascunho", "await step(second, 0); await second.getByLabel('Descrição', { exact: true }).fill('Rascunho")
# Enter on the final submit button exercises keyboard saving without bypassing the steps.
s=s.replace("await page.getByLabel('Nome público').focus(); await page.keyboard.press('Enter')", "await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).focus(); await page.keyboard.press('Enter')")
p.write_text(s,encoding='utf-8')
