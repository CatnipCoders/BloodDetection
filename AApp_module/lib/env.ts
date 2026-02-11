/**
 * Environment variable validation and type-safe access
 * Ensures all required environment variables are present at build time
 */

interface EnvironmentConfig {
  apiUrl: string
  esp32ApiUrl: string
  secugenApiUrl: string
  appName: string
  appVersion: string
  enableAnalytics: boolean
  enableErrorReporting: boolean
}

/**
 * Validate and parse environment variables
 * Throws error if required variables are missing
 */
function validateEnv(): EnvironmentConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const esp32ApiUrl = process.env.NEXT_PUBLIC_ESP32_API_URL
  const secugenApiUrl = process.env.NEXT_PUBLIC_SECUGEN_API_URL

  // Required variables
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined in environment variables')
  }

  // Optional variables with defaults
  const config: EnvironmentConfig = {
    apiUrl,
    esp32ApiUrl: esp32ApiUrl || 'http://192.168.1.193/api/vitals',
    secugenApiUrl: secugenApiUrl || 'http://localhost:8443',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Blood Group Detection System',
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableErrorReporting: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
  }

  // Validate URL formats
  try {
    new URL(config.apiUrl)
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_API_URL: ${config.apiUrl}`)
  }

  return config
}

// Export validated configuration
export const env = validateEnv()

// Helper functions for common operations
export const getApiUrl = (path: string = ''): string => {
  const base = env.apiUrl.endsWith('/') ? env.apiUrl.slice(0, -1) : env.apiUrl
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

export const getEsp32Url = (): string => env.esp32ApiUrl

export const getSecugenUrl = (): string => env.secugenApiUrl

export const isProduction = (): boolean => process.env.NODE_ENV === 'production'

export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development'
