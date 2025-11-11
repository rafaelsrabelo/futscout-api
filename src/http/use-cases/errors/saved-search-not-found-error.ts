export class SavedSearchNotFoundError extends Error {
  constructor() {
    super('Saved search not found.')
  }
}
