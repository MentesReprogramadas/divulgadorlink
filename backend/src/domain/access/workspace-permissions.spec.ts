import {expect,it} from 'vitest'
import {canWorkspace,workspaceGrants,workspaceRoute,permissionSections,publicWorkspaceAction} from './workspace-permissions'
it('novos contatos e assistente não herdam grants antigos da página',()=>{const grants={page:{read:true,write:true}};for(const section of ['contacts','assistant'] as const){expect(canWorkspace(grants,section)).toBe(false);expect(canWorkspace(grants,section,true)).toBe(false)}expect(workspaceRoute('/me/profile/suggestions/123/apply')).toBe('assistant');expect(workspaceRoute('/me/forms/submissions')).toBe('contacts')})
it('write always requires read; omitted and unknown sections never grant access',()=>{
 expect(workspaceGrants.safeParse({page:{read:false,write:true}}).success).toBe(false)
 expect(workspaceGrants.safeParse({admin:{read:true,write:true}}).success).toBe(false)
 expect(canWorkspace({},'page')).toBe(false);expect(canWorkspace({page:{read:true,write:false}},'page',true)).toBe(false)
 for(const section of permissionSections)expect(canWorkspace({[section.id]:{read:true,write:true}},section.id,true)).toBe(true)
})
it('public consent, measurements and reports keep their real actor; private reports and writes stay scoped',()=>{
 for(const path of ['/analytics/consent','/analytics/visits','/analytics/impressions','/analytics/profiles/events','/analytics/profiles/campaigns/123/events','/links/123/reports','/age'])expect(publicWorkspaceAction('POST',path)).toBe(true)
 expect(publicWorkspaceAction('GET','/links/123')).toBe(true)
 for(const path of ['/links/mine','/links/submission-started','/me/favorites','/analytics/links/123/performance'])expect(publicWorkspaceAction('GET',path)).toBe(false)
 for(const path of ['/me/profile/publish','/analytics/new-private-report','/admin/settings','/links/123/url-proposals'])expect(publicWorkspaceAction('POST',path)).toBe(false)
})
it('private route registry separates finance, import, campaign sources and reports; fails closed',()=>{
 for(const [path,section] of [['/me/profile','page'],['/me/profile/backup/import','transfer'],['/me/profile/export','transfer'],['/me/profile/campaign-sources/123','campaigns'],['/me/profile/campaigns/123/interaction','reports'],['/me/profile/media-kit/publish','presentation'],['/me/redirects/123','invitations'],['/links/mine','links'],['/links/123/discovery','links'],['/me/subscription/cancel','billing'],['/orders/123','billing'],['/me/favorites','favorites'],['/me/followed-niches','interests'],['/promotions/mine/reminders','reminders']])expect(workspaceRoute(path)).toBe(section)
 for(const path of ['/admin/users','/links/account/email','/me/profile/team','/me/profile/members/123','/me/new-private-feature','/auth/password'])expect(workspaceRoute(path)).toBeNull()
})
