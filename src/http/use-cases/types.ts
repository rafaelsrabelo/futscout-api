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

export interface AuthenticateUseCaseRequest {
  email: string
  password: string
}
export interface AuthenticateUseCaseResponse {
  user: User
}
