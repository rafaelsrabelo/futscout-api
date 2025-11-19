import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(30),

  // Database configuration
  DATABASE_URL: z.string(),
  DATABASE_URL_TEST: z.string().optional(),
  DATABASE_URL_PROD: z.string().optional(),

  // Email configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('FutScout'),
  SMTP_FROM_EMAIL: z.string().optional(),

  // OpenAI configuration
  OPENAI_API_KEY: z.string().optional(),

  // Cloudflare configuration
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),

  // Social login providers
  GOOGLE_CLIENT_IDS: z.string().optional(),
  APPLE_CLIENT_IDS: z.string().optional(),
})

const _env = envSchema.safeParse(process.env)
if (!_env.success) {
  console.error('❌ Invalid environment variables', _env.error.format())

  throw new Error('Invalid environment variables')
}

export const env = _env.data

// Função para obter a URL do banco baseado no ambiente
export function getDatabaseUrl(): string {
  const { NODE_ENV, DATABASE_URL, DATABASE_URL_TEST, DATABASE_URL_PROD } = env

  switch (NODE_ENV) {
    case 'test':
      return DATABASE_URL_TEST || DATABASE_URL
    case 'production':
      return DATABASE_URL_PROD || DATABASE_URL
    default:
      return DATABASE_URL
  }
}
