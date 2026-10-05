import 'dotenv/config'
import { z } from 'zod'
import { parsePixExpiration } from '@/domain/payments/pix-expiration'

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
  HDX_API_KEY: optionalText,
  HDX_SERVICE_NAME: textOr('divulgador-links-api'),
  STRIPE_SECRET_KEY: optionalText,
  STRIPE_PUBLISHABLE_KEY: optionalText,
  STRIPE_WEBHOOK_SECRET: optionalText,
  WOOVI_APP_ID: optionalText,
  WOOVI_API_BASE_URL: optionalUrl,
  WOOVI_WEBHOOK_SECRET: optionalText,
  WOOVI_WEBHOOK_PUBLIC_KEY: optionalText,
  OPENAI_API_KEY: optionalText,
  PIX_EXPIRATION_SECONDS: z.preprocess(blankAsUnset, z.string().optional()),

  TENANT_HOST: textOr('localhost'),
  TENANT_NAME: textOr('Localhost'),

  RESEND_API_KEY: optionalText,
  EMAIL_FROM: z.preprocess(blankAsUnset, z.string().min(3).optional()),
  APP_PUBLIC_URL: optionalUrl,
  EMAIL_BRAND_NAME: textOr('Tem Link Aqui'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(parsed.error.format())
  throw new Error('Variáveis de ambiente inválidas.')
}
parsePixExpiration(parsed.data.PIX_EXPIRATION_SECONDS, parsed.data.NODE_ENV)

export const env = parsed.data
