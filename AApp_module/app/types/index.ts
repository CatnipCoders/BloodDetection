export interface User {
  id: string
  name: string
  email: string
  blood_group: string | null
  created_at: string
  updated_at?: string
}

export interface ScanHistory {
  id: string
  user_id: string
  blood_group: string
  confidence: number
  scan_date: string
  image_url: string
}