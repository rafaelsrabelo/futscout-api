// O form do app mobile (Zod `z.string().optional().or(z.literal(''))`) rejeita
// null em campos string opcionais e quebra ao pre-encher o form de edição.
// Como atualizar o app exige release nas duas lojas, normalizamos null → ''
// na resposta dos GETs de atleta. Banco continua null (mantém a semântica
// "não preenchido"). PUT continua aceitando null para limpar.

const ATHLETE_NULLABLE_STRING_FIELDS = [
  'currentClub',
  'biography',
  'profilePhoto',
  'instagramUrl',
  'twitterUrl',
  'youtubeUrl',
  'managerName',
  'managerCompany',
  'managerContact',
] as const

const ADDRESS_NULLABLE_STRING_FIELDS = ['complement'] as const

export function coerceAthleteNullStrings<
  T extends Record<string, unknown>,
>(profile: T): T {
  const out = { ...profile } as Record<string, unknown>

  for (const field of ATHLETE_NULLABLE_STRING_FIELDS) {
    if (out[field] === null) out[field] = ''
  }

  const address = out.address as Record<string, unknown> | null | undefined
  if (address) {
    const newAddress = { ...address }
    for (const field of ADDRESS_NULLABLE_STRING_FIELDS) {
      if (newAddress[field] === null) newAddress[field] = ''
    }
    out.address = newAddress
  }

  return out as T
}
