export type SearchTaxonomy = {
  niches: Array<{slug:string;name:string}>
  networks: Array<{slug:string;name:string}>
}

export type SearchContext = {query:string;niches:string[];networks:string[];mode:'facet'|'semantic'}
export type SearchContextInput = SearchTaxonomy & {tenantId:string;query:string}
export type SearchInterpreter = (input:SearchContextInput)=>Promise<SearchContext|null>
