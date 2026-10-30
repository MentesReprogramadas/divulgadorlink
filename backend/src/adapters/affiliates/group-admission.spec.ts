import { expect, it, vi } from 'vitest'
import { AffiliateEvolution } from './evolution'

const config={baseUrl:'https://evolution.example',apiKey:'fixture-private',instance:'Principal 01'}
it('valida mensagens temporárias e usa contrato oficial de sucesso',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({success:true})).mockResolvedValueOnce(Response.json({success:false}))
  const remote=new AffiliateEvolution(config,fetcher)
  await remote.setDisappearingMessages('123@g.us',604800)
  expect(fetcher).toHaveBeenCalledWith(new URL('https://evolution.example/group/toggleEphemeral/Principal%2001?groupJid=123%40g.us'),expect.objectContaining({body:'{"expiration":604800}'}))
  await expect(remote.setDisappearingMessages('123@g.us',120)).rejects.toThrow()
  await expect(remote.setDisappearingMessages('123@g.us',604800)).rejects.toThrow()
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('expõe explicitamente extensão ausente e não interpreta envelope arbitrário como capacidade',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:404})).mockResolvedValueOnce(Response.json({version:1,joinApproval:true})).mockResolvedValueOnce(Response.json({success:true}))
  const remote=new AffiliateEvolution(config,fetcher)
  expect(await remote.groupAdmissionCapabilities()).toEqual({joinApproval:false})
  expect(await remote.groupAdmissionCapabilities()).toEqual({joinApproval:true})
  expect(await remote.groupAdmissionCapabilities()).toEqual({joinApproval:false})
})
it('preserva LID e exige confirmação por participante antes de concluir aprovação',async()=>{
  const jid='888888@lid',fetcher=vi.fn().mockResolvedValueOnce(Response.json({participants:[jid]})).mockResolvedValueOnce(Response.json({participants:[{jid,status:'200'}]})).mockResolvedValueOnce(Response.json({participants:[{jid,status:'403'}]})).mockResolvedValueOnce(Response.json({participants:[{jid:'999999@lid',status:'200'}]}))
  const remote=new AffiliateEvolution(config,fetcher)
  expect(await remote.pendingJoinRequests('123@g.us')).toEqual([jid])
  await remote.approveJoinRequest('123@g.us',jid)
  expect(fetcher).toHaveBeenLastCalledWith(expect.any(URL),expect.objectContaining({body:JSON.stringify({action:'approve',participants:[jid]})}))
  await expect(remote.approveJoinRequest('123@g.us',jid)).rejects.toMatchObject({uncertain:true})
  await expect(remote.approveJoinRequest('123@g.us',jid)).rejects.toMatchObject({uncertain:true})
})
