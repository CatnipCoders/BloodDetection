/**
 * Razorpay Payment Integration (Frontend Only)
 * Handles payment processing for health report generation
 */

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
  handler: (response: RazorpayResponse) => void
  modal?: {
    ondismiss?: () => void
  }
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    // Check if already loaded
    if ((window as any).Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Initialize Razorpay payment
 */
export const initiatePayment = async (options: RazorpayOptions): Promise<void> => {
  const isLoaded = await loadRazorpayScript()
  
  if (!isLoaded) {
    throw new Error('Failed to load Razorpay SDK')
  }

  const razorpay = new (window as any).Razorpay(options)
  razorpay.open()
}

/**
 * Format amount to paise (Razorpay uses smallest currency unit)
 */
export const formatAmountToPaise = (amount: number): number => {
  return Math.round(amount * 100)
}

/**
 * Format amount from paise to rupees
 */
export const formatAmountToRupees = (paise: number): number => {
  return paise / 100
}
