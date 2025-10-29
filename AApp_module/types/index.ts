export interface User {
  id: number
  name: string
  email: string
  blood_group: string
  confidence?: number
  created_at?: string
  updated_at?: string
}

export interface ScanHistory {
  blood_group: string
  confidence?: number
  scanned_at: string
}