import type { AuthProvider, User, UserRole } from 'generated/prisma/client.js'
import type { UserCreateInput } from 'generated/prisma/models.js'

export interface AdminUsersFilters {
  // Busca livre em name OU cpf
  q?: string
  // 'ATHLETE' | 'OBSERVER' | 'none' (sem role) | undefined (todos)
  role?: UserRole | 'none'
}

export interface AdminUsersPagination {
  page: number
  pageSize: number
}

export type AdminUserListItem = User & {
  hasAthleteProfile: boolean
  hasObserverProfile: boolean
  activePlan: 'FREE' | 'PREMIUM'
}

export interface AdminUserDetail {
  user: User
  athleteProfileId: string | null
  observerProfileId: string | null
  activePlan: 'FREE' | 'PREMIUM'
}

export interface UsersRepository {
  create(data: UserCreateInput): Promise<User>
  findByEmail(email: string): Promise<User | null>
  findByCpf(cpf: string): Promise<User | null>
  findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null>
  findById(userId: string): Promise<User | null>
  findFirstByRole(role: UserRole): Promise<User | null>
  findManyForAdmin(
    filters: AdminUsersFilters,
    pagination: AdminUsersPagination,
  ): Promise<{ items: AdminUserListItem[]; total: number }>
  findByIdForAdmin(userId: string): Promise<AdminUserDetail | null>
  update(userId: string, data: Partial<User>): Promise<User>
  updateProfile(userId: string, isProfile: boolean): Promise<User>
  updateUserActiveStatus(userId: string, isActive: boolean): Promise<User>
  updateLastLoginAt(userId: string): Promise<void>
  delete(userId: string): Promise<void>
}
