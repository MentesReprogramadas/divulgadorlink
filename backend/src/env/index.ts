import 'dotenv/config'
import { z } from 'zod'
import { parsePixExpiration } from '@/domain/payments/pix-expiration'

const schema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  HDX_API_KEY: z.string().optional(),
  HDX_SERVICE_NAME: z.string().default('divulgador-links-api'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  WOOVI_APP_ID: z.string().optional(),
  WOOVI_API_BASE_URL: z.string().url().optional(),
  WOOVI_WEBHOOK_SECRET: z.string().optional(),
  WOOVI_WEBHOOK_PUBLIC_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PIX_EXPIRATION_SECONDS: z.string().optional(),

  TENANT_HOST: z.string().default('localhost'),
  TENANT_NAME: z.string().default('Localhost'),

  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  APP_PUBLIC_URL: z.string().url().optional(),
  EMAIL_BRAND_NAME: z.string().min(1).default('Tem Link Aqui'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(parsed.error.format())
  throw new Error('Variáveis de ambiente inválidas.')
}
parsePixExpiration(parsed.data.PIX_EXPIRATION_SECONDS, parsed.data.NODE_ENV)

export const env = parsed.data
