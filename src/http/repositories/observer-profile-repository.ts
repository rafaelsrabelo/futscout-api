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
}

export interface ObserverProfile {
  id: string
  userId: string
  currentClub: string | null
  phone: string
  profilePhoto: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ObserverProfileRepository {
  create(data: CreateObserverProfileData): Promise<ObserverProfile>
  findById(id: string): Promise<ObserverProfile | null>
  findByUserId(userId: string): Promise<ObserverProfile | null>
  update(id: string, data: UpdateObserverProfileData): Promise<ObserverProfile>
}
