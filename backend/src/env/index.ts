import 'dotenv/config'
import { z } from 'zod'

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
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  WOOVI_APP_ID: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(parsed.error.format())
  throw new Error('Variáveis de ambiente inválidas.')
}

export const env = parsed.data
