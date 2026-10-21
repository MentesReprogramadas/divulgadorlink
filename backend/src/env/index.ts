import {profileHostBases} from '@/domain/profiles/profile-host'
import 'dotenv/config'
import { z } from 'zod'
import { parsePixExpiration } from '@/domain/payments/pix-expiration'
import { renewalReminderPolicy } from '@/domain/notifications/renewal-reminder'
import { monitorPolicy } from '@/domain/links/availability-monitor'

const blankAsUnset = (value: unknown) => (value === '' ? undefined : value)
const optionalText = z.preprocess(blankAsUnset, z.string().min(1).optional())
const optionalUrl = z.preprocess(blankAsUnset, z.string().url().optional())
const textOr = (fallback: string) => z.preprocess(
  (value) => (value === '' || value === undefined ? fallback : value),
  z.string().min(1),
)

const schema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  WEBHOOK_ENCRYPTION_KEY: optionalText,
  HDX_API_KEY: optionalText,
  HDX_SERVICE_NAME: textOr('divulgador-links-api'),
  STRIPE_SECRET_KEY: optionalText,
  STRIPE_PUBLISHABLE_KEY: optionalText,
  STRIPE_WEBHOOK_SECRET: optionalText,
  PROFILE_BILLING_SALES_ENABLED: z.enum(['0', '1']).default('0'),
  STRIPE_BILLING_SECRET_KEY: optionalText,
  STRIPE_BILLING_WEBHOOK_SECRET: optionalText,
  WOOVI_APP_ID: optionalText,
  WOOVI_API_BASE_URL: optionalUrl,
  WOOVI_WEBHOOK_SECRET: optionalText,
  WOOVI_WEBHOOK_PUBLIC_KEY: optionalText,
  OPENAI_API_KEY: optionalText,
  PIX_EXPIRATION_SECONDS: z.preprocess(blankAsUnset, z.string().optional()),

  PROFILE_HOST_BASES:z.string().default('{}'),
  COOLIFY_API_URL:optionalUrl,
  COOLIFY_API_TOKEN:optionalText,
  COOLIFY_PROFILE_ROUTER_UUID:optionalText,
  CLOUDFLARE_DNS_API_TOKEN:optionalText,
  PROFILE_HOST_DNS_ZONES:z.string().default('{}'),
  TENANT_HOST: textOr('localhost'),
  TENANT_NAME: textOr('Localhost'),

  RESEND_API_KEY: optionalText,
  EMAIL_FROM: z.preprocess(blankAsUnset, z.string().min(3).optional()),
  APP_PUBLIC_URL: optionalUrl,
  EMAIL_BRAND_NAME: textOr('Tem Link Aqui'),
  EVOLUTION_ENABLED: z.enum(['0', '1']).default('0'),
  EVOLUTION_ACTIONS_ENABLED: z.enum(['0', '1']).default('0'),
  EVOLUTION_BASE_URL: optionalUrl,
  EVOLUTION_INSTANCE_NAME: optionalText,
  EVOLUTION_API_KEY: optionalText,
  EVOLUTION_GROUP_JID: optionalText,
  EVOLUTION_WEBHOOK_AUTH_SECRET: optionalText,
  EVOLUTION_OPERATOR_PHONES: optionalText,
  EVOLUTION_OPERATOR_ADMIN_ID: optionalText,
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(parsed.error.format())
  throw new Error('Variáveis de ambiente inválidas.')
}
parsePixExpiration(parsed.data.PIX_EXPIRATION_SECONDS, parsed.data.NODE_ENV)
monitorPolicy(process.env)

profileHostBases(parsed.data.PROFILE_HOST_BASES,parsed.data.NODE_ENV==='production')
export const env = parsed.data

renewalReminderPolicy(process.env)
