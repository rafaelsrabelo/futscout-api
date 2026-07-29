import type { AthleteSearchFilters } from '../../repositories/saved-search-repository.js'

/**
 * Traduz os filtros para uma linha que o observador entende
 * ("Meio-campista · canhoto · até 20 anos").
 *
 * Vive no backend de propósito: se o app reimplementasse a tradução, as duas
 * versões divergiriam no primeiro filtro novo — e o rótulo do card do chat
 * deixaria de bater com o da busca salva.
 */

/** Também usado para rotular os atletas mostrados no contexto do turno. */
export function translatePosition(position: string | null): string | null {
  if (!position) return null
  return POSITION_LABEL[position] ?? position
}

const POSITION_LABEL: Record<string, string> = {
  GOALKEEPER: 'Goleiro',
  DEFENDER: 'Zagueiro',
  MIDFIELDER: 'Meio-campista',
  FORWARD: 'Atacante',
}

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  OTHER: 'Outro',
}

const FOOT_LABEL: Record<string, string> = {
  RIGHT: 'destro',
  LEFT: 'canhoto',
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  DESENVOLVIMENTO: 'Desenvolvimento',
  PERFORMANCE: 'Performance',
}

/** Altura em metros no padrão brasileiro: 1.8 → "1,80m". */
function formatHeight(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}m`
}

function formatRange(
  min: number | undefined,
  max: number | undefined,
  format: (value: number) => string,
  suffix = '',
): string | null {
  if (min !== undefined && max !== undefined) {
    return `${format(min)} a ${format(max)}${suffix}`
  }
  if (min !== undefined) return `a partir de ${format(min)}${suffix}`
  if (max !== undefined) return `até ${format(max)}${suffix}`
  return null
}

export function buildFilterSummary(
  filters: AthleteSearchFilters | null,
): string | null {
  if (!filters || Object.keys(filters).length === 0) return null

  const parts: string[] = []

  if (filters.primaryPosition) {
    parts.push(
      POSITION_LABEL[filters.primaryPosition] ?? filters.primaryPosition,
    )
  }
  if (filters.secondaryPosition) {
    const label =
      POSITION_LABEL[filters.secondaryPosition] ?? filters.secondaryPosition
    parts.push(`também ${label.toLowerCase()}`)
  }
  if (filters.gender) {
    parts.push(GENDER_LABEL[filters.gender] ?? filters.gender)
  }
  if (filters.dominantFoot) {
    parts.push(FOOT_LABEL[filters.dominantFoot] ?? filters.dominantFoot)
  }

  const age = formatRange(filters.minAge, filters.maxAge, String, ' anos')
  if (age) parts.push(age)

  const height = formatRange(filters.minHeight, filters.maxHeight, formatHeight)
  if (height) parts.push(height)

  const weight = formatRange(filters.minWeight, filters.maxWeight, String, 'kg')
  if (weight) parts.push(weight)

  if (filters.currentClub) parts.push(filters.currentClub)
  if (filters.name) parts.push(`nome "${filters.name}"`)
  if (filters.nickname) parts.push(`apelido "${filters.nickname}"`)

  if (filters.hasManager !== undefined) {
    parts.push(filters.hasManager ? 'com empresário' : 'sem empresário')
  }
  if (filters.classification) {
    parts.push(
      CLASSIFICATION_LABEL[filters.classification] ?? filters.classification,
    )
  }

  return parts.length > 0 ? parts.join(' · ') : null
}
