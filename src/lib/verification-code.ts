export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateCodeExpirationDate(minutes: number = 15): Date {
  const expirationDate = new Date()
  expirationDate.setMinutes(expirationDate.getMinutes() + minutes)
  return expirationDate
}
