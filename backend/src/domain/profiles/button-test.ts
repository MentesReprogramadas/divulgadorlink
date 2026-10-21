import {createHmac} from 'node:crypto'
import {z} from 'zod'
export const buttonTestInput=z.object({blockId:z.string().uuid(),labels:z.tuple([z.string().trim().min(1).max(100),z.string().trim().min(1).max(100)]),samplePerVariant:z.number().int().min(100).max(10000),durationDays:z.union([z.literal(7),z.literal(14),z.literal(28)])}).strict().refine(value=>value.labels[0].toLocaleLowerCase()!==value.labels[1].toLocaleLowerCase(),'Escreva duas versões diferentes.')
export type ButtonTestConfig=z.infer<typeof buttonTestInput>
export function buttonVariant(experimentId:string,session:string,secret:string):0|1{return(createHmac('sha256',secret).update(JSON.stringify(['button-test.v1',experimentId,session])).digest()[0]!%2) as 0|1}
export function buttonTestResult(config:ButtonTestConfig,counts:Array<{exposures:number;clicks:number}>,ended:boolean,earlyStop=false){
 const [a,b]=[0,1].map(index=>counts[index]??{exposures:0,clicks:0}),enough=a!.exposures>=config.samplePerVariant&&b!.exposures>=config.samplePerVariant
 const rates=[a!,b!].map(row=>row.exposures?row.clicks/row.exposures:null)
 const pooled=(a!.clicks+b!.clicks)/(a!.exposures+b!.exposures||1),error=Math.sqrt(pooled*(1-pooled)*(1/(a!.exposures||1)+1/(b!.exposures||1))),zScore=error?Math.abs((rates[0]??0)-(rates[1]??0))/error:0
 const approximationValid=[a!,b!].every(row=>row.exposures*pooled>=5&&row.exposures*(1-pooled)>=5)
 const winner=approximationValid&&ended&&!earlyStop&&enough&&zScore>=1.96&&Math.abs((rates[0]??0)-(rates[1]??0))+Number.EPSILON>=.02?(rates[0]!>rates[1]!?0:1):null
 return{status:ended?(winner===null?'INCONCLUSIVE':'CONCLUSIVE'):'RUNNING',winner,rates,minimumSample:config.samplePerVariant,method:'Teste bilateral de duas proporções; α=5%; uma análise no encerramento; frequências esperadas ≥5; diferença mínima de 2 pontos percentuais; sem correção de viés de visitantes recorrentes.',enough}
}
