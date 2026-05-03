/**
 * Redação de dados sensíveis do perfil de um atleta para terceiros.
 *
 * Hoje só zera `managerContact` (telefone do empresário/responsável) — esse
 * campo nunca deve aparecer pra outros usuários. O nome e a empresa do
 * empresário continuam visíveis. Quando o app móvel passar a ter UI
 * condicional, dá pra reverter este helper sem subir versão.
 *
 * Uso: chame em qualquer endpoint que devolva o perfil de um atleta para
 * alguém que **não** é o próprio dono. NÃO use em /admin/* nem em
 * /athletes/profile (perfil próprio).
 */
export function redactAthleteSensitiveFields<
  T extends { managerContact?: string | null },
>(athlete: T): T {
  return {
    ...athlete,
    managerContact: null,
  }
}
