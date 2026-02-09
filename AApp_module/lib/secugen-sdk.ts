/**
 * SecuGen Hamster Pro 20 SDK Integration
 * 
 * This module provides a TypeScript wrapper for the SecuGen fingerprint scanner.
 * The SecuGen Web API uses a local service that runs on the client machine.
 */

export interface SecuGenDevice {
  deviceName: string
  deviceID: number
  width: number
  height: number
}

export interface SecuGenImage {
  imageData: string // Base64 encoded image
  width: number
  height: number
  quality: number
}

export interface SecuGenSDK {
  Init: () => Promise<number>
  GetDeviceList: () => Promise<SecuGenDevice[]>
  OpenDevice: (deviceID: number) => Promise<number>
  CloseDevice: () => Promise<number>
  GetImage: () => Promise<SecuGenImage>
  GetImageEx: (timeout: number, quality: number) => Promise<SecuGenImage>
  SetLedOn: (on: boolean) => Promise<number>
  GetDeviceInfo: () => Promise<any>
}

declare global {
  interface Window {
    SecuGen?: SecuGenSDK
    SGIFPLib?: any
  }
}

class SecuGenScanner {
  private sdk: SecuGenSDK | null = null
  private deviceID: number = 0
  private isInitialized: boolean = false
  private isDeviceOpen: boolean = false

  /**
   * Initialize the SecuGen SDK
   * This should be called when the component mounts
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if SecuGen Web API is available
      if (!window.SecuGen && !window.SGIFPLib) {
        console.error('SecuGen SDK not found. Please install SecuGen Web API.')
        return false
      }

      this.sdk = window.SecuGen || window.SGIFPLib

      if (!this.sdk) {
        console.error('Failed to load SecuGen SDK')
        return false
      }

      // Initialize the SDK
      const result = await this.sdk.Init()
      if (result !== 0) {
        console.error('Failed to initialize SecuGen SDK:', result)
        return false
      }

      this.isInitialized = true
      console.log('SecuGen SDK initialized successfully')
      return true
    } catch (error) {
      console.error('Error initializing SecuGen SDK:', error)
      return false
    }
  }

  /**
   * Get list of connected SecuGen devices
   */
  async getDevices(): Promise<SecuGenDevice[]> {
    if (!this.sdk || !this.isInitialized) {
      throw new Error('SDK not initialized. Call initialize() first.')
    }

    try {
      const devices = await this.sdk.GetDeviceList()
      return devices || []
    } catch (error) {
      console.error('Error getting device list:', error)
      return []
    }
  }

  /**
   * Open a SecuGen device for capturing
   */
  async openDevice(deviceID: number = 0): Promise<boolean> {
    if (!this.sdk || !this.isInitialized) {
      throw new Error('SDK not initialized. Call initialize() first.')
    }

    try {
      const result = await this.sdk.OpenDevice(deviceID)
      if (result !== 0) {
        console.error('Failed to open device:', result)
        return false
      }

      this.deviceID = deviceID
      this.isDeviceOpen = true
      
      // Turn on LED to indicate device is ready
      await this.setLED(true)
      
      console.log('Device opened successfully')
      return true
    } catch (error) {
      console.error('Error opening device:', error)
      return false
    }
  }

  /**
   * Close the currently open device
   */
  async closeDevice(): Promise<boolean> {
    if (!this.sdk || !this.isDeviceOpen) {
      return true
    }

    try {
      // Turn off LED
      await this.setLED(false)
      
      const result = await this.sdk.CloseDevice()
      if (result !== 0) {
        console.error('Failed to close device:', result)
        return false
      }

      this.isDeviceOpen = false
      console.log('Device closed successfully')
      return true
    } catch (error) {
      console.error('Error closing device:', error)
      return false
    }
  }

  /**
   * Capture a fingerprint image
   * @param timeout - Timeout in milliseconds (default: 10000)
   * @param quality - Minimum quality threshold 0-100 (default: 50)
   */
  async captureFingerprint(timeout: number = 10000, quality: number = 50): Promise<Blob | null> {
    if (!this.sdk || !this.isDeviceOpen) {
      throw new Error('Device not open. Call openDevice() first.')
    }

    try {
      console.log('Waiting for fingerprint...')
      
      // Capture image with quality check
      const image = await this.sdk.GetImageEx(timeout, quality)
      
      if (!image || !image.imageData) {
        console.error('No image data received')
        return null
      }

      console.log('Fingerprint captured successfully', {
        width: image.width,
        height: image.height,
        quality: image.quality
      })

      // Convert base64 to Blob
      const blob = this.base64ToBlob(image.imageData, 'image/bmp')
      return blob
    } catch (error) {
      console.error('Error capturing fingerprint:', error)
      return null
    }
  }

  /**
   * Set LED state (on/off)
   */
  async setLED(on: boolean): Promise<boolean> {
    if (!this.sdk || !this.isDeviceOpen) {
      return false
    }

    try {
      await this.sdk.SetLedOn(on)
      return true
    } catch (error) {
      console.error('Error setting LED:', error)
      return false
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<any> {
    if (!this.sdk || !this.isDeviceOpen) {
      throw new Error('Device not open. Call openDevice() first.')
    }

    try {
      const info = await this.sdk.GetDeviceInfo()
      return info
    } catch (error) {
      console.error('Error getting device info:', error)
      return null
    }
  }

  /**
   * Check if device is connected and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.isDeviceOpen
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
    this.sdk = null
    this.isInitialized = false
  }
}

// Export singleton instance
export const secuGenScanner = new SecuGenScanner()

// Export class for creating multiple instances if needed
export default SecuGenScanner
