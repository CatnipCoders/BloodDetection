/**
 * Password Manager for Report Access (Frontend Only)
 * Generates and validates secure passwords for report access
 */

// Simple hash function for password generation (no crypto-js needed)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).toUpperCase()
}

const PASSWORD_PREFIX = 'HR'

/**
 * Generate a unique password for a user
 * Format: HR-XXXX-XXXX (e.g., HR-A7B9-C3D5)
 */
export function generateReportPassword(email: string, phone: string): string {
  const timestamp = Date.now()
  const data = `${email}-${phone}-${timestamp}`
  const hash = simpleHash(data)
  
  // Take first 8 characters and format as HR-XXXX-XXXX
  const part1 = hash.substring(0, 4).toUpperCase()
  const part2 = hash.substring(4, 8).toUpperCase()
  
  return `${PASSWORD_PREFIX}-${part1}-${part2}`
}

/**
 * Store password in localStorage with user info
 */
export function storePassword(email: string, phone: string, password: string): void {
  const key = generateStorageKey(email, phone)
  const data = {
    password,
    email,
    phone,
    createdAt: new Date().toISOString(),
    accessCount: 0,
    lastAccess: new Date().toISOString()
  }
  
  localStorage.setItem(key, JSON.stringify(data))
  
  // Also store in a master list for quick lookup
  const masterList = getMasterList()
  if (!masterList.includes(key)) {
    masterList.push(key)
    localStorage.setItem('report_passwords_master', JSON.stringify(masterList))
  }
}

/**
 * Check if user has already paid (has valid password)
 */
export function hasValidPassword(email: string, phone: string): boolean {
  const key = generateStorageKey(email, phone)
  const stored = localStorage.getItem(key)
  
  if (!stored) return false
  
  try {
    const data = JSON.parse(stored)
    return data.email === email && data.phone === phone
  } catch (error) {
    console.error('Error validating password:', error)
    return false
  }
}

/**
 * Get stored password for user
 */
export function getStoredPassword(email: string, phone: string): string | null {
  const key = generateStorageKey(email, phone)
  const stored = localStorage.getItem(key)
  
  if (!stored) return null
  
  try {
    const data = JSON.parse(stored)
    
    // Update access count and last access
    data.accessCount += 1
    data.lastAccess = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(data))
    
    return data.password
  } catch (error) {
    console.error('Error retrieving password:', error)
    return null
  }
}

/**
 * Validate password entered by user
 */
export function validatePassword(email: string, phone: string, password: string): boolean {
  const storedPassword = getStoredPassword(email, phone)
  return storedPassword === password
}

/**
 * Generate storage key from email and phone
 */
function generateStorageKey(email: string, phone: string): string {
  const normalized = `${email.toLowerCase()}-${phone.replace(/\D/g, '')}`
  return `report_password_${simpleHash(normalized)}`
}

/**
 * Get master list of all stored passwords
 */
function getMasterList(): string[] {
  const stored = localStorage.getItem('report_passwords_master')
  return stored ? JSON.parse(stored) : []
}

/**
 * Send password via email/SMS (simulated - shows in console and alert)
 */
export async function sendPasswordToUser(
  email: string,
  phone: string,
  password: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('='.repeat(60))
    console.log('PASSWORD GENERATED FOR USER')
    console.log('='.repeat(60))
    console.log(`Name: ${userName}`)
    console.log(`Email: ${email}`)
    console.log(`Phone: ${phone}`)
    console.log(`Password: ${password}`)
    console.log('='.repeat(60))
    console.log('NOTE: In production, integrate with email/SMS service')
    console.log('='.repeat(60))
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      success: true,
      message: `Password sent to ${email} and ${phone}`
    }
  } catch (error) {
    console.error('Error sending password:', error)
    return {
      success: false,
      message: 'Failed to send password'
    }
  }
}
