import type { ProfileContent } from './profile-contract'
import { normalizedProfile } from './profile-diff'
const labels: Record<string, string> = {none:'Sem capa',banner:'Faixa do tema', solid: 'Sólido', gradient: 'Degradê', filled: 'Preenchido', outline: 'Contorno', shadow: 'Com sombra', square: 'Retangular', rounded: 'Arredondado', pill: 'Cápsula', modern: 'Moderna', classic: 'Clássica', clean: 'Simples', center: 'Centralizado', left: 'À esquerda' }
const appearanceValue = (value: string | boolean | undefined) => typeof value === 'boolean' || value === undefined ? value === true ? 'Ativada' : 'Desativada' : labels[value] ?? value
type ComparisonRow = { label: string; historical: string; current: string; changed: boolean }
export function profileComparison(historical: ProfileContent, current: ProfileContent): ComparisonRow[] {
  const a = normalizedProfile(historical), b = normalizedProfile(current)
  const row = (label: string, before: string, after: string) => ({ label, historical: before || '—', current: after || '—', changed: before !== after })
  return [row('Nome da página', a.name, b.name), row('Descrição', a.bio, b.bio), row('Foto', a.avatarAssetId ? 'Com foto' : 'Sem foto', b.avatarAssetId ? 'Com foto' : 'Sem foto'), row('Conteúdo adulto', a.requiresAge ? 'Sim' : 'Não', b.requiresAge ? 'Sim' : 'Não'),
    ...Object.keys(a.appearance!).map(key => { const field = key as keyof NonNullable<ProfileContent['appearance']>; const labels = { coverStyle:'Capa da página',searchEnabled: 'Busca na página', background: 'Cor de fundo', buttonColor: 'Cor dos botões', backgroundStyle: 'Fundo', buttonStyle: 'Estilo dos botões', radius: 'Formato dos botões', font: 'Fonte', alignment: 'Alinhamento' }; return row(labels[field], appearanceValue(a.appearance![field]), appearanceValue(b.appearance![field])) }),
    row('Grupos e links', describe(a), describe(b)), row('Link principal', a.items.find(item => item.id === a.primaryItemId)?.label ?? 'Nenhum', b.items.find(item => item.id === b.primaryItemId)?.label ?? 'Nenhum')].map(item => item.label === 'Foto' ? { ...item, changed: a.avatarAssetId !== b.avatarAssetId } : item)
}
function describe(value: ProfileContent) {
  return value.categories.map(group => [group.name + (group.visible ? '' : ' (oculto)'), ...value.items.filter(item => item.categoryId === group.id).map(item => `${item.label}${item.visible ? '' : ' (oculto)'} • ${item.type === 'CATALOG' ? 'Catálogo: ' : ''}${item.destination}${item.schedule ? '\nAgenda: '+(item.schedule.startsAt??'sem início')+' → '+(item.schedule.endsAt??'sem fim')+' • '+item.schedule.timeZone+(item.schedule.paused?' • pausado':'') : ''}`)].join('\n')).join('\n\n')
}
