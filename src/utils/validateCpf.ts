const VALID_LENGTH = 11

export function validateCpf(cpf: string) {
  if (!cpf) return false
  const cleanedCpf = clean(cpf)
  if (cleanedCpf.length !== VALID_LENGTH) return false
  if (allDigitsEqual(cleanedCpf)) return false
  const dg1 = calculateDigit(cleanedCpf, 10)
  const dg2 = calculateDigit(cleanedCpf, 11)
  return extractDigit(cleanedCpf) === `${dg1}${dg2}`
}

export function normalizeCpf(cpf: string): string {
  return clean(cpf)
}

function clean(cpf: string) {
  return cpf.replace(/\D/g, '')
}

function allDigitsEqual(cpf: string) {
  const [firstDigit] = cpf
  return [...cpf].every((digit) => digit === firstDigit)
}

function calculateDigit(cpf: string, factor: number) {
  let total = 0
  let currentFactor = factor
  for (const digit of cpf) {
    if (currentFactor > 1) total += Number.parseInt(digit) * currentFactor--
  }
  const rest = total % 11
  return rest < 2 ? 0 : 11 - rest
}

function extractDigit(cpf: string) {
  return cpf.substring(cpf.length - 2, cpf.length)
}
