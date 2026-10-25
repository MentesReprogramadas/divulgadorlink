import type { ActionIconName } from "@/components/ui/action-icon";
export type ProfileEditorSection =
  | "overview"
  | "groups"
  | "identity"
  | "content"
  | "appearance"
  | "search"
  | "contact"
  | "discovery";
export function profileEditorSection(
  value: string | string[] | undefined,
): ProfileEditorSection | undefined {
  switch (value) {
    case "visao-geral":
      return "overview";
    case "pagina":
    case "apresentacao":
      return "identity";
    case "links":
      return "groups";
    case "conteudo":
      return "content";
    case "aparencia":
      return "appearance";
    case "busca":
      return "search";
    case "formulario":
      return "contact";
    case "descoberta":
      return "discovery";
    default:
      return undefined;
  }
}
export const profileEditorPaths: Record<ProfileEditorSection, string> = {
  overview: "/painel/perfil",
  identity: "/painel/perfil/dados",
  groups: "/painel/perfil/links",
  content: "/painel/perfil/conteudo",
  appearance: "/painel/perfil/aparencia",
  search: "/painel/perfil/busca",
  contact: "/painel/perfil/formulario",
  discovery: "/painel/perfil/descoberta",
};
export const profileEditorSections: Array<{
  id: ProfileEditorSection;
  label: string;
  icon: ActionIconName;
}> = [
  { id: "overview", label: "Visão geral", icon: "pageSummary" },
  { id: "identity", label: "Apresentação", icon: "pageIdentity" },
  { id: "groups", label: "Grupos e links", icon: "pageGroups" },
  { id: "content", label: "Conteúdo", icon: "pageContent" },
  { id: "appearance", label: "Aparência", icon: "appearance" },
  { id: "search", label: "Busca e filtros", icon: "pageSearch" },
  { id: "contact", label: "Formulário", icon: "contactForm" },
  { id: "discovery", label: "Descoberta", icon: "pageDiscovery" },
];
