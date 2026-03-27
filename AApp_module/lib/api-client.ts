/**
 * API Client for Backend Integration
 * Handles all communication with Flask backend
 * Updated to support custom user IDs
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface User {
  id: number
  user_id: string
  name: string
  email: string
  phone?: string
  age?: number
  gender?: string
  blood_group?: string
  confidence?: number
  created_at?: string
  updated_at?: string
}

export interface VitalSigns {
  spo2: number
  heart_rate: number
  perfusion_index?: number
  recorded_at?: string
}

export interface HealthReport {
  report_id: string
  blood_group: string
  spo2: number
  heart_rate: number
  perfusion_index?: number
  spo2_status: string
  heart_rate_status: string
  overall_severity: string
  overall_summary: string
  critical_alert?: string
  generated_at: string
}

/**
 * Get user by custom user_id
 */
export async function getUser(userId: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

/**
 * Create new user with custom user_id
 */
export async function createUser(data: {
  user_id: string
  name: string
  email: string
  phone?: string
  age?: number
  gender?: string
}): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create user")
    }
    return await response.json()
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

/**
 * Update user's blood group
 */
export async function updateBloodGroup(
  userId: string,
  data: { blood_group: string; confidence?: number }
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/blood-group`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return response.ok
  } catch (error) {
    console.error("Error updating blood group:", error)
    return false
  }
}

/**
 * Add vital signs for a user
 */
export async function addVitalSigns(
  userId: string,
  vitals: { spo2: number; heart_rate: number; perfusion_index?: number }
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/vitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vitals),
    })
    return response.ok
  } catch (error) {
    console.error("Error adding vital signs:", error)
    return false
  }
}

/**
 * Get vital signs for a user
 */
export async function getUserVitals(userId: string): Promise<{
  latest: VitalSigns | null
  history: VitalSigns[]
} | null> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/vitals`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("Error fetching vitals:", error)
    return null
  }
}

/**
 * Save health report for a user
 */
export async function saveHealthReport(userId: string, reportData: any): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData),
    })
    return response.ok
  } catch (error) {
    console.error("Error saving report:", error)
    return false
  }
}

/**
 * Get health reports for a user
 */
export async function getUserReports(userId: string): Promise<HealthReport[]> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/reports`)
    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    console.error("Error fetching reports:", error)
    return []
  }
}

/**
 * Get complete user data (user info + vitals + reports)
 */
export async function getUserCompleteData(userId: string): Promise<any | null> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/complete`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("Error fetching complete user data:", error)
    return null
  }
}

/**
 * List all users
 */
export async function listUsers(limit: number = 100): Promise<User[]> {
  try {
    const response = await fetch(`${API_URL}/api/users?limit=${limit}`)
    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    console.error("Error listing users:", error)
    return []
  }
}

/**
 * Check if user has complete data (blood group + vitals)
 */
export async function hasCompleteData(userId: string): Promise<{
  hasBloodGroup: boolean
  hasVitals: boolean
  isComplete: boolean
}> {
  try {
    const userData = await getUserCompleteData(userId)
    if (!userData) {
      return { hasBloodGroup: false, hasVitals: false, isComplete: false }
    }

    const hasBloodGroup = !!userData.blood_group
    const hasVitals = !!userData.latest_vitals

    return {
      hasBloodGroup,
      hasVitals,
      isComplete: hasBloodGroup && hasVitals,
    }
  } catch (error) {
    console.error("Error checking complete data:", error)
    return { hasBloodGroup: false, hasVitals: false, isComplete: false }
  }
}
