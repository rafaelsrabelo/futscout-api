import { env } from '@/env/index.js'
import { SocialTokenVerificationError } from '@/http/use-cases/errors/social-token-verification-error.js'
import appleSigninAuth from 'apple-signin-auth'
import { OAuth2Client } from 'google-auth-library'

interface SocialProfile {
  providerId: string
  email?: string | null
  name?: string | null
  emailVerified?: boolean
}

const googleClient = new OAuth2Client()

function parseAudienceList(raw?: string | null) {
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map((audience) => audience.trim())
    .filter(Boolean)
}

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<SocialProfile> {
  const audiences = parseAudienceList(env.GOOGLE_CLIENT_IDS)

  if (audiences.length === 0) {
    throw new SocialTokenVerificationError(
      'Variável GOOGLE_CLIENT_IDS não configurada para validação do Google.',
    )
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: audiences,
    })

    const payload = ticket.getPayload()

    if (!payload || !payload.sub) {
      throw new SocialTokenVerificationError(
        'Token do Google sem identificador válido.',
      )
    }

    return {
      providerId: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? null,
      emailVerified: payload.email_verified ?? true,
    }
  } catch (error) {
    throw new SocialTokenVerificationError('Token do Google inválido.')
  }
}

interface AppleVerifyResponse {
  sub: string
  email?: string
  email_verified?: 'true' | 'false'
}

export async function verifyAppleIdToken(
  identityToken: string,
): Promise<SocialProfile> {
  const audiences = parseAudienceList(env.APPLE_CLIENT_IDS)

  if (audiences.length === 0) {
    throw new SocialTokenVerificationError(
      'Variável APPLE_CLIENT_IDS não configurada para validação da Apple.',
    )
  }

  try {
    const payload = (await appleSigninAuth.verifyIdToken(identityToken, {
      audience: audiences,
      ignoreExpiration: false,
    })) as AppleVerifyResponse

    if (!payload?.sub) {
      throw new SocialTokenVerificationError(
        'Token da Apple sem identificador válido.',
      )
    }

    return {
      providerId: payload.sub,
      email: payload.email ?? null,
      emailVerified: payload.email_verified === 'true',
    }
  } catch (error) {
    throw new SocialTokenVerificationError('Token da Apple inválido.')
  }
}
