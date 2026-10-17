from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks/frontend')
p=root/'e2e/renewal-reminders.spec.ts';s=p.read_text(encoding='utf-8')
s=s.replace("  const checkbox = page.getByRole('checkbox'", "  await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click()\n  const checkbox = page.getByRole('checkbox'")
s=s.replace("await page.goto(A + '/painel/lembretes'); await checkbox.uncheck()", "await page.goto(A + '/painel/lembretes'); await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click(); await checkbox.uncheck()")
s=s.replace("await page.reload(); await expect(checkbox).toBeChecked()", "await page.reload(); await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click(); await expect(checkbox).toBeChecked()")
s=s.replace("  await cycle()\n", "  await page.keyboard.press('Escape')\n  await cycle()\n",1)
p.write_text(s,encoding='utf-8')
p=root/'e2e/link-availability.spec.ts';s=p.read_text(encoding='utf-8')
s=s.replace("async function login(page: Page, email: string) {", "async function login(page: Page, email: string) {\n  await page.keyboard.press('Escape')")
s=s.replace("  await page.getByLabel('Convite para análise').fill", "  await page.getByRole('button', { name: 'Corrigir link', exact: true }).click()\n  await page.getByLabel('Convite para análise').fill")
p.write_text(s,encoding='utf-8')
# Remove only whitespace on newly emptied lines, without reformatting whole files.
for f in ['src/app/admin/estornos/page.tsx','src/app/painel/conta/page.tsx','src/components/domain/panel.tsx','src/features/availability/availability-screen.tsx','src/features/renewal-reminders/renewal-reminders-screen.tsx']:
 p=root/f;s=p.read_text(encoding='utf-8');p.write_text('\n'.join('' if not l.strip() else l for l in s.splitlines())+'\n',encoding='utf-8')
