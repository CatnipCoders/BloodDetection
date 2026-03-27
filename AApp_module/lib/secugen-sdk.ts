/**
 * SecuGen Hamster Pro 20 SDK Integration
 * Direct HTTP POST with URL-encoded parameters (matching official demo)
 */

interface SecuGenResponse {
  ErrorCode: number
  BMPBase64?: string
  ImageWidth?: number
  ImageHeight?: number
  ImageQuality?: number
  ImageDPI?: number
  NFIQ?: number
  SerialNumber?: string
  TemplateBase64?: string
  WSQImage?: string
  WSQImageSize?: number
  [key: string]: any
}

class SecuGenScanner {
  private baseUrl: string = 'https://localhost:8443/SGIFPCapture'
  private fallbackUrl: string = 'http://localhost:8443/SGIFPCapture'
  private isInitialized: boolean = false
  private deviceOpened: boolean = false
  private licenseKey: string = '' // Empty for 60-day trial
  private useHttp: boolean = false // Track if we should use HTTP

  /**
   * Initialize the SecuGen Web API
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('SecuGen Web API initialized (no library needed)')
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Error initializing SecuGen Web API:', error)
      return false
    }
  }

  /**
   * Get list of connected SecuGen devices
   */
  async getDevices(): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Call initialize() first.')
    }

    // SecuGen Web API auto-detects devices
    return [{ deviceID: 0, deviceName: 'SecuGen Hamster Pro 20' }]
  }

  /**
   * Open a SecuGen device for capturing
   */
  async openDevice(deviceID: number = 0): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Call initialize() first.')
    }

    console.log('Device ready for capture')
    this.deviceOpened = true
    return true
  }

  /**
   * Close the currently open device
   */
  async closeDevice(): Promise<boolean> {
    console.log('Device closed')
    this.deviceOpened = false
    return true
  }

  /**
   * Capture a fingerprint image
   * @param timeout - Timeout in milliseconds (default: 10000)
   * @param quality - Minimum quality threshold 0-100 (default: 50)
   */
  async captureFingerprint(timeout: number = 10000, quality: number = 50): Promise<Blob | null> {
    if (!this.isInitialized || !this.deviceOpened) {
      throw new Error('Device not initialized. Call initialize() and openDevice() first.')
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('Waiting for fingerprint...')
        
        const xhr = new XMLHttpRequest()
        
        // Add timeout handler
        xhr.timeout = timeout + 5000 // Add 5 seconds buffer
        xhr.ontimeout = () => {
          console.error('XMLHttpRequest timeout')
          resolve(null)
        }
        
        xhr.onreadystatechange = () => {
          console.log(`XHR readyState: ${xhr.readyState}, status: ${xhr.status}`)
          
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                console.log('Response received, parsing JSON...')
                const result: SecuGenResponse = JSON.parse(xhr.responseText)
                
                console.log('Response received:', result)
                
                if (result.ErrorCode !== 0) {
                  console.error('Capture failed. Error code:', result.ErrorCode)
                  console.error('Error description:', this.errorCodeToString(result.ErrorCode))
                  resolve(null)
                  return
                }

                if (!result.BMPBase64) {
                  console.error('No image data received')
                  resolve(null)
                  return
                }

                console.log('Fingerprint captured successfully', {
                  width: result.ImageWidth,
                  height: result.ImageHeight,
                  quality: result.ImageQuality,
                  nfiq: result.NFIQ,
                  serialNumber: result.SerialNumber
                })

                // Convert base64 to Blob
                const blob = this.base64ToBlob(result.BMPBase64, 'image/bmp')
                resolve(blob)
              } catch (error) {
                console.error('Error parsing response:', error)
                console.error('Response text:', xhr.responseText)
                reject(error)
              }
            } else if (xhr.status === 404) {
              console.error('Service not found (404). Is SecuGen Web API Service running?')
              resolve(null)
            } else if (xhr.status === 0) {
              console.error('Network error or CORS issue (status 0)')
              resolve(null)
            } else {
              console.error('HTTP error:', xhr.status, xhr.statusText)
              console.error('Response text:', xhr.responseText)
              resolve(null)
            }
          }
        }

        xhr.onerror = (e) => {
          console.error('Network error:', e)
          
          // If HTTPS failed and we haven't tried HTTP yet, try HTTP
          if (!this.useHttp) {
            console.log('HTTPS failed, trying HTTP...')
            this.useHttp = true
            // Retry with HTTP
            this.captureFingerprint(timeout, quality).then(resolve).catch(reject)
          } else {
            console.error('Both HTTPS and HTTP failed')
            reject(new Error('Network error - Check if SecuGen Web API Service is running'))
          }
        }

        // Build URL-encoded parameters (matching official demo)
        const params = new URLSearchParams()
        params.append('Timeout', timeout.toString())
        params.append('Quality', quality.toString())
        params.append('licstr', this.licenseKey)
        params.append('templateFormat', 'ISO')
        params.append('imageWSQRate', '0.75')

        console.log('Sending request to:', this.useHttp ? this.fallbackUrl : this.baseUrl)
        console.log('Parameters:', params.toString())

        xhr.open('POST', this.useHttp ? this.fallbackUrl : this.baseUrl, true)
        xhr.send(params.toString())
        
        console.log('Request sent, waiting for response...')
        
      } catch (error) {
        console.error('Error capturing fingerprint:', error)
        reject(error)
      }
    })
  }

  /**
   * Set LED state (on/off)
   */
  async setLED(on: boolean): Promise<boolean> {
    // LED control is automatic in this API
    console.log(`LED ${on ? 'ON' : 'OFF'} (automatic)`)
    return true
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Device not initialized.')
    }

    return {
      deviceName: 'SecuGen Hamster Pro 20',
      width: 260,
      height: 300
    }
  }

  /**
   * Check if device is connected and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.deviceOpened
  }

  /**
   * Convert error code to human-readable string
   */
  private errorCodeToString(errorCode: number): string {
    const errorMap: { [key: number]: string } = {
      51: 'System file load failure',
      52: 'Sensor chip initialization failed',
      53: 'Device not found',
      54: 'Fingerprint image capture timeout',
      55: 'No device available',
      56: 'Driver load failed',
      57: 'Wrong Image',
      58: 'Lack of bandwidth',
      59: 'Device Busy',
      60: 'Cannot get serial number of the device',
      61: 'Unsupported device',
      63: 'SgiBioSrv didn\'t start; Try image capture again'
    }

    return errorMap[errorCode] || 'Unknown error code'
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string = 'image/bmp'): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.closeDevice()
    this.isInitialized = false
    this.deviceOpened = false
  }
}

// Export singleton instance
export const secuGenScanner = new SecuGenScanner()

// Export class for creating multiple instances if needed
export default SecuGenScanner
