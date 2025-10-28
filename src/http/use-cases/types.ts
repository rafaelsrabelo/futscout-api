import type { User } from 'generated/prisma/client.js'

type UserRole = 'ATHLETE' | 'OBSERVER' | 'ADMIN'

export interface RegisterUseCaseRequest {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface RegisterUseCaseResponse {
  user: User
}
