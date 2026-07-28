/**
 * A OpenAI recusou a chamada por cota estourada, chave inválida ou falha de
 * infra dela. Diferente do `ScoutChatDisabledError`, aqui a chave existe — o
 * problema é externo e temporário, então o observador merece uma mensagem
 * diferente de "chat desativado".
 */
export class ScoutChatUnavailableError extends Error {
  constructor() {
    super('Scout chat provider is unavailable.')
  }
}
