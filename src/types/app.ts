export interface Friend {
  id: string
  name: string
  address: string
  avatarId: 1 | 2 | 3 | 5
}

export interface FriendProfile {
  friendRowId: string
  friendshipStatus: 'pending' | 'accepted'
  iRequested: boolean
  profile: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

export interface Receipt {
  id: string
  date: string
  to: string
  from: string
  prompt?: string
  content: string
  imageDataUrl?: string
  friendId: string
  receiptStateJson?: string | null
  receiptImage?: string | null
  printedAt?: string | null
}
