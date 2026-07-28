/**
 * O chat depende de OPENAI_API_KEY, que é opcional no env: a API sobe sem ela e
 * só o chat falha. Assim um deploy sem a chave não derruba o resto.
 */
export class ScoutChatDisabledError extends Error {
  constructor() {
    super('Scout chat is disabled: OPENAI_API_KEY is not configured.')
  }
}
