import {AssistantScreen} from '@/features/profile-assistant/assistant-screen'
import {PoolScreen} from '@/features/redirect-pools/pool-screen'
import {ContactScreen} from '@/features/contact-forms/contact-screen'
import {MediaKitScreen} from '@/features/media-kit/media-kit-screen'
import {WorkspaceTeamScreen} from '@/features/workspace-team/workspace-team-screen'
import {CampaignScreen} from '@/features/profile-campaigns/campaign-screen'
import {NicheFollowsScreen} from '@/features/niche-follows/niche-follows-screen'
import {ProfileExportScreen} from '@/features/profiles/profile-export-screen'
import { DashboardSkeleton, FormSkeleton, ListSkeleton, DetailSkeleton, ActionSkeleton, FiltersSkeleton } from './workspace-skeleton'
import { AccountSkeleton } from '@/features/account/components/account-skeleton'
import { FavoritesPageSkeleton } from '@/features/favorites/components/favorites-skeleton'
import { RedirectListSkeleton } from '@/features/redirects/components/redirect-skeleton'
import { AvailabilitySkeleton, CorrectionsQueueSkeleton } from '@/features/availability/components/availability-skeleton'
import { ReportQueueSkeleton, ReportSubmissionSkeleton, AppealSkeleton } from '@/features/moderation/components/report-skeleton'
import { ReminderSkeleton } from '@/features/renewal-reminders/components/reminder-skeleton'
import { PerformanceSkeleton } from '@/features/promotions/components/performance-skeleton'
import { CheckoutSkeleton, PlanPageSkeleton } from '@/features/promotions/components/plans-skeleton'
import { EvolutionIntegrationSkeleton } from '@/components/domain/evolution-integration-skeleton'
import { OfficeSkeleton } from '@/features/administration/components/insight-skeleton'
import { SettingsSkeleton } from '@/features/administration/components/settings-skeleton'
import { SubmissionSkeleton } from '@/features/link-submission/components/submission-skeleton'
import { ProfilePageSkeleton } from '@/features/profiles/components/profile-editor-skeleton'
import { ProfileHistorySkeleton } from '@/features/profiles/components/profile-history-skeleton'
import { BillingSkeleton } from '@/features/profile-billing/billing-screen'
import { BillingAdminSkeleton } from '@/features/profile-billing/billing-admin'
import { TemplatesSkeleton } from '@/features/profile-templates/templates-skeleton'
import { ImportSkeleton } from '@/features/profile-import/import-skeleton'
import {InteractionScreen} from '@/features/profile-interaction/interaction-screen'
import {ProfileChecklistScreen} from '@/features/profile-checklist/checklist-screen'
import {Suspense} from 'react'
import {ProfileRouteSkeleton} from '@/features/profiles/components/profile-route-skeleton'
import {ChannelsScreen} from '@/features/profile-channels/channels-screen'
/** Route shells and their client data boundaries use the same composition. */
export function WorkspaceContentSkeleton({ path }: { path: string }) {
  if(['/painel/perfil/dados','/painel/perfil/links','/painel/perfil/aparencia'].includes(path))return <ProfilePageSkeleton section={path.endsWith('/dados')?'identity':path.endsWith('/links')?'groups':'appearance'}/>
  if(/^\/painel\/convites\/[^/]+\/distribuicao$/.test(path))return <PoolScreen id={path.split('/')[3]} pendingOnly/>
  if(path==='/painel/perfil/assistente')return <AssistantScreen pendingOnly/>
  if(path==='/painel/perfil/contatos')return <ContactScreen pendingOnly/>
  if(path==='/painel/perfil/midia-kit')return <MediaKitScreen pendingOnly/>
  if(path==='/painel/equipe')return <WorkspaceTeamScreen pendingOnly/>
  if(/^\/painel\/equipe\/[^/]+\/editar$/.test(path))return <ProfilePageSkeleton collaborative/>
  if(path==='/painel/perfil/campanhas')return <CampaignScreen pendingOnly/>
  if(/^\/painel\/perfil\/campanhas\/[^/]+\/metricas$/.test(path))return <InteractionScreen pendingOnly campaignId={path.split('/')[4]}/>
  if(path==='/painel/interesses')return <NicheFollowsScreen pendingOnly/>
  if(path==='/painel/perfil/exportar')return <ProfileExportScreen pendingOnly/>
  if(path==='/painel/perfil/canais')return <ChannelsScreen pendingOnly/>
  if(path.startsWith('/painel/perfil/canais/'))return <ChannelsScreen pendingOnly entry={path.endsWith('/novo')?{kind:'NEW'}:{kind:'EDIT',id:path.split('/').at(-1)!}}/>
  if(path==='/painel/perfil/checklist')return <ProfileChecklistScreen pendingOnly/>
  if(path==='/painel/perfil/metricas')return <InteractionScreen pendingOnly/>
  if (path === '/painel/assinatura') return <BillingSkeleton />
  if (path === '/admin/assinaturas') return <BillingAdminSkeleton />
  if (path === '/painel/perfil/historico') return <ProfileHistorySkeleton />
  if (path === '/painel/perfil/modelos') return <TemplatesSkeleton />
  if (path === '/painel/perfil/importar') return <ImportSkeleton />
  if (path === '/painel' || path === '/painel/visao') return <DashboardSkeleton />
  if (path.includes('/links/novo')) return <SubmissionSkeleton />
  if (path.endsWith('/editar')) return <FormSkeleton fields={2} multiline />
  if (path.endsWith('/perfil')) return <Suspense fallback={<ProfilePageSkeleton/>}><ProfileRouteSkeleton/></Suspense>
  if (path.endsWith('/resultado')) return <PerformanceSkeleton />
  if (path === '/admin/visao') return <><ActionSkeleton /><FiltersSkeleton count={1} /><OfficeSkeleton section="metricas" /></>
  if (path.endsWith('/conta')) return <AccountSkeleton />
  if (path.endsWith('/pedidos') || path.endsWith('/estornos')) return <ListSkeleton kind="orders" />
  if (path.endsWith('/links')) return <ListSkeleton filters={4} />
  if (path.endsWith('/moderacao')) return <ListSkeleton kind="queue" />
  if (path.endsWith('/denuncias')) return <><ActionSkeleton count={3} /><FiltersSkeleton /><ReportQueueSkeleton /></>
  if (path === '/admin/disponibilidade') return <><ActionSkeleton /><CorrectionsQueueSkeleton /></>
  if (path.endsWith('/disponibilidade')) return <><ActionSkeleton count={2} /><AvailabilitySkeleton /></>
  if (path.endsWith('/favoritos')) return <FavoritesPageSkeleton />
  if (path.endsWith('/convites')) return <><ActionSkeleton count={3} /><RedirectListSkeleton /></>
  if (path.endsWith('/lembretes')) return <><ActionSkeleton /><ReminderSkeleton /></>
  if (path.endsWith('/planos')) return <PlanPageSkeleton />
  if (path.endsWith('/configuracoes')) return <SettingsSkeleton />
  if (path.endsWith('/integracoes')) return <EvolutionIntegrationSkeleton />
  if (path.includes('/denunciar/')) return <ReportSubmissionSkeleton />
  if (path.endsWith('/contestar')) return <AppealSkeleton />
  if (path.endsWith('/destaque')) return <CheckoutSkeleton />
  return <DetailSkeleton />
}
