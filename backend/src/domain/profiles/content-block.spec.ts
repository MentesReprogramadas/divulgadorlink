import {expect,it} from 'vitest'
import {randomUUID} from 'node:crypto'
import {contentBlockInput,videoEmbedUrl} from './content-block'
import {profileAt,type ProfileContent} from './profile'
import {profileModerationChanges,profileModerationText} from './profile-moderation'
import {buildProfileExport} from './profile-export'
import {readProfileBackup} from './profile-backup'
const text={id:randomUUID(),type:'TEXT' as const,title:'Serviços',body:'Consultoria personalizada',visible:true}
const content:ProfileContent={slug:'meus-servicos',name:'Ana',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[],contentBlocks:[text,{id:randomUUID(),type:'IMAGE',title:'Portfólio',assetId:'a'.repeat(64),alt:'Peça artesanal',caption:'Trabalho recente',visible:true},{id:randomUUID(),type:'VIDEO',title:'Bastidores',url:'https://youtu.be/dQw4w9WgXcQ',visible:false}]}
it('aceita apenas provedores e formatos conhecidos, sem credenciais, portas ou HTML',()=>{
 expect(videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
 expect(videoEmbedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789?dnt=1')
 for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://a:b@youtube.com/watch?v=dQw4w9WgXcQ','https://youtube.com:444/watch?v=dQw4w9WgXcQ','<iframe>'])expect(videoEmbedUrl(url)).toBeNull()
 expect(contentBlockInput.safeParse({...text,body:'x'.repeat(3001)}).success).toBe(false)
 expect(contentBlockInput.safeParse({...text,html:'<script>'}).success).toBe(false)
})
it('projeção nega blocos pagos por padrão e nunca expõe ocultos; texto participa da moderação',()=>{
 expect(profileAt(content,new Set(),new Date(),false).content.contentBlocks).toEqual([])
 expect(profileAt(content,new Set(),new Date(),false,true).content.contentBlocks).toHaveLength(2)
 expect(profileModerationText(content)).toContain(text.body)
 expect(profileModerationChanges(content,{...content,contentBlocks:[]}).changedFields).toContain('blocos de conteúdo')
})
it('backup mantém texto e vídeo, renova IDs e declara imagens que precisam ser reenviadas',()=>{
 const exported=buildProfileExport(content,'draft',new Date())
 const imported=readProfileBackup(exported)
 expect(imported.contentBlocks).toHaveLength(2)
 expect(imported.contentBlocks?.[0]).toMatchObject({type:'TEXT',body:text.body})
 expect(imported.contentBlocks?.[0].id).not.toBe(text.id)
 expect(exported.assetsManifest).toContainEqual(expect.objectContaining({kind:'contentImages',included:false}))
})
