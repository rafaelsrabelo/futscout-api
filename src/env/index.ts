import 'dotenv/config'
import { z } from 'zod'

const envSchema = z
  .object({
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
    // Modelo usado pelo chat de busca (IAFutscore)
    AI_CHAT_MODEL: z.string().default('gpt-4o-mini'),

    // Cloudflare configuration
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    CLOUDFLARE_R2_BUCKET: z.string().optional(),
    CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),
    // R2 S3-compatible credentials (for presigned URLs)
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
    CLOUDFLARE_R2_ENDPOINT: z.string().optional(),

    // Social login providers
    GOOGLE_CLIENT_IDS: z.string().optional(),
    APPLE_CLIENT_IDS: z.string().optional(),

    // Stripe configuration
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    // URL de redirecionamento do app após pagamento (deep link)
    // Exemplo para mobile: futscout://payment/success
    APP_REDIRECT_URL: z.string().default('futscout://payment'),

    // Expo Push Notifications — opcional; sem token o SDK envia anonimamente.
    EXPO_ACCESS_TOKEN: z.string().optional(),

    // Default admin credentials (consumed by seedAdmin on startup).
    // Required in dev and test, optional in production so that prod boots
    // even when the admin row already exists and secrets are not re-set.
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') return

    if (!data.ADMIN_EMAIL) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_EMAIL'],
        message: 'ADMIN_EMAIL is required in dev and test environments',
      })
    }

    if (!data.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_PASSWORD'],
        message: 'ADMIN_PASSWORD is required in dev and test environments',
      })
    }
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
