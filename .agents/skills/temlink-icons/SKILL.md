---
name: temlink-icons
description: Escolher, alterar ou auditar ícones do frontend Tem Link Aqui em menus, abas, ações, campos e estados, garantindo que contextos diferentes nunca compartilhem o mesmo símbolo.
---

# Ícones por significado

Regra do usuário: um ícone nunca pode representar contextos diferentes. Repetir somente quando o significado for o mesmo, inclusive entre rotas, cabeçalho, sidebar, atalhos, estados de carregamento e versão mobile.

- Antes de escolher um símbolo, localizar seus usos em `frontend/src` e os assets em `frontend/public`. Comparar o significado e o desenho renderizado; trocar o nome, tamanho, cor ou espessura não torna um desenho diferente.
- Consultar `frontend/src/components/ui/action-icon.tsx` para desenhos e `frontend/src/components/layout/navigation-icons.ts` para destinos. Reutilizar esses contratos; atualizar todos os consumidores do mesmo conceito na mesma alteração.
- Distinguir destino, categoria e ação: Publicação, Links, Criar link e Convites são contextos diferentes. Favoritos usa estrela nos cards, abas e navegação; destaque usa megafone. Não trocar a estrela de favoritos por coração; copiar não usa o de abrir externamente; Pix não usa o de cartão.
- Ações com o mesmo significado podem repetir: editar registros, salvar formulários, remover itens, pesquisar e expandir/recolher. Um novo objeto não muda sozinho o significado da ação. Marcas identificam a mesma rede em todas as superfícies.
- Se não houver símbolo claro e exclusivo, manter o rótulo e remover o ícone decorativo redundante. Não inventar diferenças só cosméticas para satisfazer a regra.
- Preservar rótulos acessíveis e ícones decorativos com `aria-hidden`. Não usar o ícone como única explicação de uma ação sem nome acessível.
- Rodar os testes de navegação/ícones e revisar desktop/mobile com grupos expandidos. Os testes detectam colisões registradas; a revisão semântica e visual também é obrigatória para novos usos fora do mapa.

Seguir `AGENTS.md` para proteções do produto e fechamento. Registrar novos significados em `docs/frontend-profissional/icones-e-navegacao.md`.
