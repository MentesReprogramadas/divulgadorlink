export type SuggestionGenerationInput={facts:string[];links:Array<{index:number;label:string;host:string}>}
export type SuggestionGeneration={output:unknown;inputTokens:number|null;outputTokens:number|null}
export type ProfileSuggestionPort={generate:(input:SuggestionGenerationInput)=>Promise<SuggestionGeneration>}
