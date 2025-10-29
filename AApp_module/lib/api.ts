import { User } from "@/app/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_URL}/api/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function getUserById(id: number): Promise<User> {
  const res = await fetch(`${API_URL}/api/users/${id}`)
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export async function getUserHistory(id: number): Promise<any[]> {
  const res = await fetch(`${API_URL}/api/users/${id}/history`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function updateUserBloodGroup(id: number, blood_group: string, confidence?: number) {
  const res = await fetch(`${API_URL}/api/users/${id}/blood-group`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blood_group, confidence }),
  })
  if (!res.ok) throw new Error('Failed to update blood group')
  return res.json()
}

export async function createUser(data: {
  name: string
  email: string
  blood_group: string
  confidence?: number
}) {
  const res = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create user')
  return res.json()
}