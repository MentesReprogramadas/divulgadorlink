import {expect,it} from 'vitest'
import {personalHostTarget,personalHostApiAllowed,publicHostCookies,personalHostOrigin} from './host-routing'
const bases=JSON.stringify({'temlinkaqui.com':'temlinkaqui.com'})
it('permite preparar CSRF público sem liberar sessão ou autenticação no host pessoal',()=>{
 expect(personalHostApiAllowed('GET','/v1/auth/csrf','ana')).toBe(true)
 for(const method of ['POST','PUT','PATCH','DELETE'])expect(personalHostApiAllowed(method,'/v1/auth/csrf','ana')).toBe(false)
 for(const path of ['/v1/auth/session','/v1/auth/login','/v1/auth/refresh'])expect(personalHostApiAllowed('GET',path,'ana')).toBe(false)
 expect(publicHostCookies('accessToken=private; refreshToken=private; csrf=public')).toBe('csrf=public')
})
it('F10-U01 hostname exato não confia em X-Forwarded-Host ou sufixo parecido',()=>{expect(personalHostTarget('ANA.temlinkaqui.com:443',bases)).toEqual({hostname:'ana.temlinkaqui.com',tenantHost:'temlinkaqui.com'});for(const host of ['temlinkaqui.com','ana.temlinkaqui.com.evil.test','eviltemlinkaqui.com','ana@temlinkaqui.com'])expect(personalHostTarget(host,bases)).toBeNull();expect(personalHostOrigin('temlinkaqui.com','3000')).toBe('https://temlinkaqui.com')})
it('F10-C02 BFF permite somente APIs públicas da mesma página e métodos previstos',()=>{for(const path of ['/v1/profiles/ana','/v1/profiles/ana/items','/v1/profiles/ana/avatar/'+'a'.repeat(64)])expect(personalHostApiAllowed('GET',path,'ana')).toBe(true);for(const [method,path] of [['GET','/v1/me/profile'],['POST','/v1/auth/refresh'],['GET','/v1/profiles/bia'],['POST','/v1/profiles/ana/publish'],['DELETE','/v1/profiles/ana/contact-form'],['GET','/v1/admin/config']])expect(personalHostApiAllowed(method,path,'ana')).toBe(false);expect(personalHostApiAllowed('POST','/v1/profiles/ana/contact-form/submissions','ana')).toBe(true)})
it('F10-I01 cookies privados não atravessam BFF público; consentimento permanece independente',()=>{expect(publicHostCookies('accessToken=secret; refreshToken=secret; catalogo_role=ADMIN; workspaceOwner=other; age=yes; tla_consent=denied; tla_profile_measure=v1_yes; analyticsSession=public')).toBe('age=yes; tla_consent=denied; tla_profile_measure=v1_yes; analyticsSession=public')})

it('F10-U01 raiz mais específica mantém isolamento com raízes aninhadas',()=>{expect(personalHostTarget('ana.pages.example.com',JSON.stringify({'example.com':'main.example.com','pages.example.com':'other.example.com'}))).toEqual({hostname:'ana.pages.example.com',tenantHost:'other.example.com'})})
