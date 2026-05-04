import type {
  AdminUserListItem,
  AdminUsersFilters,
  UsersRepository,
} from '../../repositories/users-repository.js'

export interface ListUsersAdminUseCaseRequest extends AdminUsersFilters {
  page?: number
  pageSize?: number
}

export interface ListUsersAdminUseCaseResponse {
  items: AdminUserListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export class ListUsersAdminUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    page = 1,
    pageSize = 20,
    q,
    role,
  }: ListUsersAdminUseCaseRequest): Promise<ListUsersAdminUseCaseResponse> {
    const safePage = Math.max(1, Math.floor(page))
    const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))

    const { items, total } = await this.usersRepository.findManyForAdmin(
      { q, role },
      { page: safePage, pageSize: safePageSize },
    )

    const totalPages = Math.max(1, Math.ceil(total / safePageSize))

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    }
  }
}
