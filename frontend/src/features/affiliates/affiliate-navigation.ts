export type AffiliateArea = 'overview' | 'segments' | 'groups' | 'instances' | 'offers' | 'catalog' | 'deliveries'

export const affiliateAreas: Array<{ id: AffiliateArea; label: string; path: string; description: string }> = [
  { id: 'overview', label: 'Visão geral', path: '', description: 'Acompanhe a operação e escolha o próximo passo.' },
  { id: 'segments', label: 'Segmentações', path: 'segmentacoes', description: 'Organize os temas, as conexões e os convites permanentes dos grupos.' },
  { id: 'groups', label: 'Grupos', path: 'grupos', description: 'Confira os grupos, as vagas e a última sincronização.' },
  { id: 'instances', label: 'Conexões WhatsApp', path: 'conexoes', description: 'Cadastre suas contas e conecte o WhatsApp pelo QR code.' },
  { id: 'catalog', label: 'Catálogo Mercado Livre', path: 'catalogo', description: 'Busque produtos e gere links de afiliado para suas ofertas.' },
  { id: 'offers', label: 'Ofertas', path: 'ofertas', description: 'Revise produtos e escolha quando enviar para os grupos.' },
  { id: 'deliveries', label: 'Histórico de envios', path: 'historico', description: 'Acompanhe a fila e confira o resultado de cada entrega.' },
]
export const affiliateAreaPath = (area: AffiliateArea) => '/admin/afiliados' + (affiliateAreas.find(item => item.id === area)?.path ? '/' + affiliateAreas.find(item => item.id === area)!.path : '')
