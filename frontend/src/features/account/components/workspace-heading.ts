export function workspaceHeading(path: string): { title: string; hint: string } {
  if(/^\/painel\/convites\/[^/]+\/distribuicao$/.test(path))return {title:'Distribuidor de convites',hint:''}
  if(path.startsWith('/painel/equipe/'))return {title:'Página compartilhada',hint:''}
  if(path==='/painel/perfil/endereco')return {title:'Endereço próprio',hint:''}
  const titles: Record<string, [string, string]> = {
    "/painel/perfil/divulgar": ["Criar imagem de divulgação", ""],
    "/painel/equipe": ["Equipe e permissões", ""],
    "/painel": ["Painel", "Tudo o que você precisa para cuidar dos seus links."],
    "/painel/links": ["Meus links", "Encontre um link e escolha o próximo passo."],
    "/painel/pedidos": ["Meus pedidos", "Pagamentos e destaques, em um só lugar."],
    "/painel/assinatura": ["Assinatura da minha página", "Seu plano e os próximos pagamentos."],
    "/painel/perfil/assistente": ["Assistente de criação", ""],
    "/painel/perfil/contatos": ["Contatos recebidos", ""],
    "/painel/perfil/dados": ["Dados da página", ""],
    "/painel/perfil/links": ["Grupos e links", ""],
    "/painel/perfil/aparencia": ["Aparência da página", ""],
    "/painel/perfil": ["Minha página de links", "Organize sua página e publique quando estiver pronta."],
    "/painel/perfil/metricas": ["Métricas da minha página", "Acompanhe a interação com os seus links."],
    "/painel/perfil/checklist": ["Checklist da minha página", "Veja o próximo passo para publicar e compartilhar."],
    "/painel/perfil/canais": ["Canais de acesso", "Deixe o visitante escolher onde entrar."],
    "/painel/perfil/midia-kit": ["Apresentação para parceiros", ""],
    "/painel/perfil/campanhas": ["Campanhas da minha página", ""],
    "/painel/perfil/exportar": ["Importar e exportar página", ""],
    "/painel/perfil/historico": ["Histórico da minha página", "Compare e restaure uma publicação anterior."],
    "/painel/perfil/modelos": ["Modelos da minha página", "Escolha uma estrutura e personalize no seu rascunho."],
    "/painel/perfil/importar": ["Importar links para minha página", "Revise e organize antes de adicionar ao rascunho."],
    "/painel/convites": ["Convites permanentes", "Um endereço fixo. O destino você atualiza."],
    "/painel/favoritos": ["Favoritos", "Seus links salvos, organizados por você."],
    "/painel/interesses": ["Categorias seguidas", ""],
    "/painel/lembretes": ["Lembretes", "Escolha quais avisos quer receber."],
    "/painel/conta": ["Minha conta", "Seus dados, acesso e preferências."],
    "/admin/visao": ["Admin", "Uma visão clara da operação e dos próximos passos."],
    "/admin/moderacao": ["Moderação", "Confira cada envio antes de decidir."],
    "/admin/denuncias": ["Denúncias", "Analise os relatos e acompanhe as decisões."],
    "/admin/disponibilidade": ["Correções de links", "Confira os convites corrigidos pelos responsáveis."],
    "/admin/destaques": ["Destaques administrativos", ""],
    "/admin/planos": ["Planos de destaque", "Organize as ofertas disponíveis no checkout."],
    "/admin/assinaturas": ["Assinaturas de páginas", "Planos mensais e pendências de cobrança."],
    "/admin/estornos": ["Estornos", "Acompanhe as devoluções e tentativas pendentes."],
    "/admin/integracoes": ["Integrações", "Conexões e avisos da operação."],
    "/admin/configuracoes": ["Configurações", "Ajuste as opções e o conteúdo do catálogo."],
  };
  if(/^\/painel\/perfil\/campanhas\/[^/]+\/metricas$/.test(path))return{title:"Métricas da campanha",hint:""}
  const value = titles[path];
  if (value) return { title: value[0], hint: value[1] };
  if(path.startsWith('/painel/perfil/canais/'))return{title:path.endsWith('/novo')?'Novo grupo de canais':'Grupo de canais',hint:'Organize as alternativas no rascunho da página.'}
  const linkTasks: Record<string, [string, string]> = {
    editar: ["Editar link", "Atualize os dados do conteúdo que você compartilha."],
    destaque: ["Destacar link", "Confira as opções disponíveis para este link."],
    contestar: ["Contestar decisão", "Explique o que precisa ser revisto."],
    disponibilidade: ["Disponibilidade do link", "Confira o acesso e envie uma correção quando necessário."],
    resultado: ["Resultado do destaque", "Acompanhe os dados disponíveis para este destaque."],
  };
  const task = linkTasks[path.split('/').at(-1) ?? ''];
  if (task) return { title: task[0], hint: task[1] };
  return { title: path.includes("/novo") ? "Novo link" : "Gerenciar link", hint: "Confira os dados e conclua sua tarefa." };
}

