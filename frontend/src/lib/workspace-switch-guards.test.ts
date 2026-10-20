import {expect,it} from 'vitest'
import {prepareWorkspaceSwitch,registerWorkspaceSwitchGuard} from './workspace-switch-guards'
it('workspace switch waits for pending saves and aborts on a failed save',async()=>{
 let complete!:()=>void;const saved=new Promise<void>(resolve=>{complete=resolve});const remove=registerWorkspaceSwitchGuard(()=>saved);let switched=false;const switching=prepareWorkspaceSwitch().then(()=>{switched=true});expect(switched).toBe(false);complete();await switching;expect(switched).toBe(true);remove();const failed=registerWorkspaceSwitchGuard(async()=>{throw new Error('Rascunho mantido')});await expect(prepareWorkspaceSwitch()).rejects.toThrow('Rascunho mantido');failed();await expect(prepareWorkspaceSwitch()).resolves.toBeUndefined()
})
