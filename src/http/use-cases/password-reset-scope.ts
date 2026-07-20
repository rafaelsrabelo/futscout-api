// Escopo do resetToken emitido em /auth/forgot-password/verify.
// Só tokens com este escopo são aceitos em /auth/reset-password — um access
// token de sessão normal (que não carrega `scope`) é rejeitado.
export const PASSWORD_RESET_SCOPE = 'password-reset'
