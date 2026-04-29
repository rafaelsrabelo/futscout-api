export interface CreateObserverProfileData {
  userId: string
  name: string
  currentClub?: string | null
  phone: string
  profilePhoto?: string | null
}

export interface UpdateObserverProfileData {
  name?: string
  currentClub?: string | null
  phone?: string
  profilePhoto?: string | null
}

export interface ObserverProfile {
  id: string
  userId: string
  name: string
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
