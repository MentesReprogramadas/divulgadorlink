const guards=new Set<()=>Promise<unknown>>()
export function registerWorkspaceSwitchGuard(guard:()=>Promise<unknown>){guards.add(guard);return()=>{guards.delete(guard)}}
export async function prepareWorkspaceSwitch(){for(const guard of guards)await guard()}
