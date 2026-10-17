export function workspaceHeading(path: string): { title: string; hint: string } {
  const titles: Record<string, [string, string]> = {
    "/painel": ["Painel", "Tudo o que você precisa para cuidar dos seus links."],
    "/painel/links": ["Meus links", "Encontre um link e escolha o próximo passo."],
    "/painel/pedidos": ["Meus pedidos", "Pagamentos e destaques, em um só lugar."],
    "/painel/perfil": ["Minha página de links", "Organize sua página e publique quando estiver pronta."],
    "/painel/convites": ["Convites permanentes", "Um endereço fixo. O destino você atualiza."],
    "/painel/favoritos": ["Favoritos", "Seus links salvos, organizados por você."],
    "/painel/lembretes": ["Lembretes", "Escolha quais avisos quer receber."],
    "/painel/conta": ["Minha conta", "Seus dados, acesso e preferências."],
    "/admin/visao": ["Admin", "Uma visão clara da operação e dos próximos passos."],
    "/admin/moderacao": ["Moderação", "Confira cada envio antes de decidir."],
    "/admin/denuncias": ["Denúncias", "Analise os relatos e acompanhe as decisões."],
    "/admin/disponibilidade": ["Correções de links", "Confira os convites corrigidos pelos responsáveis."],
    "/admin/planos": ["Planos de destaque", "Organize as ofertas disponíveis no checkout."],
    "/admin/estornos": ["Estornos", "Acompanhe as devoluções e tentativas pendentes."],
    "/admin/integracoes": ["Integrações", "Conexões e avisos da operação."],
    "/admin/configuracoes": ["Configurações", "Ajuste as opções e o conteúdo do catálogo."],
  };
  const value = titles[path];
  if (value) return { title: value[0], hint: value[1] };
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

