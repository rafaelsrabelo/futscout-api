// O nome não vive aqui — fonte única é `users.name`, definido no cadastro.
export interface CreateObserverProfileData {
  userId: string
  currentClub?: string | null
  phone: string
  profilePhoto?: string | null
}

export interface UpdateObserverProfileData {
  currentClub?: string | null
  phone?: string
  profilePhoto?: string | null
  notifyOnFavoriteActivity?: boolean
}

export interface ObserverProfile {
  id: string
  userId: string
  currentClub: string | null
  phone: string
  profilePhoto: string | null
  /** Avisar quando um atleta favoritado cadastra partida ou publica lance. */
  notifyOnFavoriteActivity: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ObserverProfileRepository {
  create(data: CreateObserverProfileData): Promise<ObserverProfile>
  findById(id: string): Promise<ObserverProfile | null>
  findByUserId(userId: string): Promise<ObserverProfile | null>
  update(id: string, data: UpdateObserverProfileData): Promise<ObserverProfile>
  /**
   * Dentre os userIds passados, quais aceitam aviso de atividade de favoritos.
   * Observador sem perfil não entra — não há como ele ter desativado, mas
   * também não é um observador ativo no app.
   */
  filterUserIdsAcceptingFavoriteActivity(userIds: string[]): Promise<string[]>
}
