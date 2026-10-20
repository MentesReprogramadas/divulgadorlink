from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks');p=r/'frontend/playwright.config.ts';s=p.read_text(encoding='utf-8').replace('testMatch: /public-collections','testMatch: /profile-hosts\\.spec\\.ts|public-collections');p.write_text(s,encoding='utf-8')
