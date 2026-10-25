import {spawn,execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import 'dotenv/config'
process.env.NODE_ENV??='dev'
if(process.env.NODE_ENV!=='dev')throw new Error('npm run dev exige NODE_ENV=dev.')
const require=createRequire(import.meta.url),tsx=require.resolve('tsx/cli')
// Local development needs a consumer for integration deliveries as well as the API.
const children=[['src/server.ts'],['src/worker.ts','--webhooks-only']].map(args=>spawn(process.execPath,[tsx,'watch',...args],{stdio:'inherit',shell:false}))
let stopping=false
function stop(code=0){
 if(stopping)return;stopping=true
 for(const child of children){
  if(!child.pid||child.exitCode!==null)continue
  if(process.platform==='win32'){try{execFileSync('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore'})}catch{/* child already stopped */}}
  else child.kill('SIGTERM')
 }
 process.exitCode=code
}
for(const child of children){child.once('error',error=>{console.error(error.message);stop(1)});child.once('exit',code=>stop(code??1))}
process.once('SIGINT',()=>stop());process.once('SIGTERM',()=>stop())
