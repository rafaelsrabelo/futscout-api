/**
 * Tentativa de salvar um turno que não produziu busca — uma pergunta da IA,
 * por exemplo. Não há filtro nenhum para persistir.
 */
export class ScoutMessageHasNoFiltersError extends Error {
  constructor() {
    super('This message has no search filters to save.')
  }
}
