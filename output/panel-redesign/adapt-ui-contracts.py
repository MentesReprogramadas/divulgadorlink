from pathlib import Path
root=Path('C:/VSCODE/divulgadorlinks/frontend')
empty=['Clique em Novo link permanente para criar seu primeiro endereço.','Este link não tem uma revisão aberta.','Nenhuma correção aguardando análise.','Nenhuma denúncia neste filtro.','Nenhum destaque perto do vencimento.']
for p in list((root/'src').rglob('*.test.tsx'))+list((root/'e2e').glob('*.spec.ts')):
 s=p.read_text(encoding='utf-8')
 for text in empty:s=s.replace(text,'Nada por aqui ainda.')
 if p.name=='admin-links-board.test.tsx':s=s.replace("'Carregando…'","'Carregando'")
 if p.name=='finance-panel.test.tsx':
  s="import { chooseSelect } from '@/test-select'\n"+s
  s=s.replace("fireEvent.change(screen.getByLabelText('Método'), { target: { value: 'PIX' } })", "await chooseSelect(screen.getByLabelText('Método'), 'PIX')")
 if p.name=='link-promotion-editor.test.tsx':s=s.replace("(screen.getByLabelText('Período') as HTMLSelectElement).value", "screen.getByLabelText('Período').querySelector('[data-select-value]')?.getAttribute('data-select-value')")
 p.write_text(s,encoding='utf-8')
for file in ['e2e/admin-promotions.spec.ts','e2e/promotion-performance.spec.ts']:
 p=root/file;s=p.read_text(encoding='utf-8').replace("import { selectOption }", "import { expectSelected, selectOption }")
 import re
 s=re.sub(r"await expect\((dialog.getByLabel\('Período'\)|page.getByLabel\('Campanha', \{ exact: true \}\))\).toHaveValue\(([^)]+)\)",r'await expectSelected(\1, \2)',s)
 p.write_text(s,encoding='utf-8')
p=root/'e2e/workspace-layout.spec.ts';s=p.read_text(encoding='utf-8')
s=s.replace("    await drawer.getByText('Publicação', { exact: true }).click()\n    await expect(drawer.getByRole('link', { name: 'Links', exact: true })).toBeHidden()", "    await expect(drawer.getByRole('link', { name: 'Links', exact: true })).toBeHidden()\n    await drawer.getByText('Publicação', { exact: true }).focus()")
s=s.replace("  await nav.getByRole('link', { name: 'Links', exact: true }).click()", "  if (!await nav.getByRole('link', { name: 'Links', exact: true }).isVisible()) await nav.getByText('Publicação', { exact: true }).click()\n  await nav.getByRole('link', { name: 'Links', exact: true }).click()")
s=s.replace("await expect(page.getByText('Etapa 2 de 3: Assunto e descrição')).toBeFocused()", "await expect(page.getByText('Etapa 2 de 3: Assunto e descrição')).toBeFocused()")
p.write_text(s,encoding='utf-8')
p=root/'e2e/ui-quality.spec.ts';s=p.read_text(encoding='utf-8')
s=s.replace("const sections = await selector.locator('option').evaluateAll(options => options.map(option => ({ value: (option as HTMLOptionElement).value, label: option.textContent })))", "const sections = [{value:'metricas',label:'Métricas'}, {value:'contas',label:'Contas'}, {value:'links',label:'Links'}, {value:'cliques',label:'Cliques'}, {value:'pagadores',label:'Pagadores'}, {value:'trafego',label:'Tráfego'}, {value:'financeiro',label:'Financeiro'}, {value:'retencao',label:'Retenção'}]")
s=s.replace("const input = control as HTMLInputElement\n          return", "const input = control as HTMLInputElement\n          if (input.getAttribute('aria-hidden') === 'true') return false\n          return")
p.write_text(s,encoding='utf-8')
