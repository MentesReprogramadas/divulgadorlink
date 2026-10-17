const fs=require('node:fs'), path=require('node:path')
const target=path.resolve('docs/frontend-profissional/evidencias/painel-admin-2026-10-16')
fs.mkdirSync(target,{recursive:true})
for(const [source,destination]of Object.entries({
 'painel-desktop.png':'panel-overview-desktop.png','painel-mobile.png':'panel-overview-mobile.png',
 'painel-links-desktop.png':'panel-links-desktop.png','painel-links-mobile.png':'panel-links-mobile.png',
 'admin-visao-desktop.png':'admin-overview-desktop.png','admin-visao-mobile.png':'admin-overview-mobile.png',
 'painel-pedidos-mobile.png':'panel-orders-mobile.png','painel-favoritos-mobile.png':'favorites-mobile.png',
 'collections-mobile.png':'collections-mobile.png','collection-form-mobile.png':'collection-dialog-mobile.png',
 'painel-perfil-mobile.png':'profile-mobile.png','upload-mobile.png':'profile-upload-mobile.png',
 'painel-links-novo-mobile.png':'submission-mobile.png','select-mobile.png':'select-mobile.png',
 'sidebar-panel.png':'sidebar-panel-mobile.png','sidebar-admin.png':'sidebar-admin-mobile.png',
}))fs.copyFileSync(path.resolve('output/panel-redesign',source),path.join(target,destination))
const candidates=path.resolve('output/panel-redesign/visual-candidates')
for(const suffix of ['desktop','mobile']) {
 const directory=fs.readdirSync(candidates).find(name=>name.startsWith('workspace-layout-W02-')&&name.endsWith('ui-'+suffix))
 if(!directory)throw new Error('Missing final moderation screenshot: '+suffix)
 fs.copyFileSync(path.join(candidates,directory,'admin-moderation.png'),path.join(target,'admin-moderation-'+suffix+'.png'))
}
