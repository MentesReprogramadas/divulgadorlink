export type ReminderPreferences = { emailRenewal: boolean; expectedVersion: number }
export type RenewalReminder = { promotionId: string; link: { id: string; name: string }; surface: string; expiresAt: string; status: string; renewPath: string; resultPath: string; summary: { from: string; to: string; impressions: number; clicks: number; dataState: string; coverage: string } | null }
export type RenewalRemindersData = { preferences: ReminderPreferences; reminders: RenewalReminder[] }
export const surfaceLabel: Record<string, string> = { SEARCH: 'Busca', NICHE: 'Categoria', HOME: 'Página inicial' }
export function reminderDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
