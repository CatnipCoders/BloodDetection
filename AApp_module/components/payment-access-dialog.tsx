"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Mail, Phone, CheckCircle, AlertTriangle, Loader2, Key } from "lucide-react"
import { 
  hasValidPassword, 
  getStoredPassword, 
  validatePassword,
  generateReportPassword,
  storePassword,
  sendPasswordToUser
} from "@/lib/password-manager"
import { initiatePayment, formatAmountToPaise, type RazorpayResponse } from "@/lib/razorpay"

interface PaymentAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  amount: number
  onAccessGranted: () => void
}

export function PaymentAccessDialog({
  open,
  onOpenChange,
  userName,
  amount,
  onAccessGranted,
}: PaymentAccessDialogProps) {
  const [step, setStep] = useState<'credentials' | 'payment' | 'password'>('credentials')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const handleCheckCredentials = () => {
    setError(null)
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    
    // Validate phone (10 digits)
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    
    // Check if user has already paid
    if (hasValidPassword(email, phone)) {
      setIsReturningUser(true)
      const storedPassword = getStoredPassword(email, phone)
      if (storedPassword) {
        setGeneratedPassword(storedPassword)
        setStep('password')
      }
    } else {
      setIsReturningUser(false)
      setStep('payment')
    }
  }

  const handlePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!razorpayKey) {
        throw new Error("Razorpay key not configured")
      }

      // Initialize Razorpay payment (frontend only, no backend)
      await initiatePayment({
        key: razorpayKey,
        amount: formatAmountToPaise(amount),
        currency: 'INR',
        name: "Health Report Access",
        description: "One-time payment for lifetime report access",
        prefill: {
          name: userName,
          email: email,
          contact: phone,
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response: RazorpayResponse) => {
          // Payment successful - generate and store password
          const newPassword = generateReportPassword(email, phone)
          storePassword(email, phone, newPassword)
          setGeneratedPassword(newPassword)
          
          // Send password to user (simulated)
          await sendPasswordToUser(email, phone, newPassword, userName)
          
          setStep('password')
          setLoading(false)
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setError("Payment cancelled. Please try again to access the report.")
          },
        },
      })
    } catch (err) {
      console.error("Payment error:", err)
      setError(err instanceof Error ? err.message : "Payment failed")
      setLoading(false)
    }
  }

  const handlePasswordSubmit = () => {
    setError(null)
    
    if (!password) {
      setError('Please enter the password')
      return
    }
    
    if (validatePassword(email, phone, password)) {
      onAccessGranted()
      onOpenChange(false)
      // Reset state
      setStep('credentials')
      setEmail('')
      setPhone('')
      setPassword('')
      setGeneratedPassword(null)
    } else {
      setError('Invalid password. Please check the password shown above.')
    }
  }

  const handleBack = () => {
    if (step === 'payment') {
      setStep('credentials')
    } else if (step === 'password' && !isReturningUser) {
      setStep('payment')
    } else {
      setStep('credentials')
    }
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            {step === 'credentials' && 'Report Access Verification'}
            {step === 'payment' && 'One-Time Payment'}
            {step === 'password' && 'Enter Access Password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' && 'Enter your email and phone to check access status'}
            {step === 'payment' && 'Complete payment for lifetime report access'}
            {step === 'password' && isReturningUser && 'Welcome back! Enter your password'}
            {step === 'password' && !isReturningUser && 'Password generated! Save it for future access'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleCheckCredentials()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleCheckCredentials()}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-xs text-blue-900 flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Returning users: Your password will be retrieved automatically.
                    New users: Pay once for lifetime access.
                  </span>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Patient Name:</span>
                  <span className="font-semibold">{userName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="font-semibold text-sm">{email}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Phone:</span>
                  <span className="font-semibold">{phone}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-300">
                  <span className="text-sm text-gray-600">One-Time Fee:</span>
                  <span className="text-2xl font-bold text-green-600">₹{amount}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">What you'll get:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Lifetime access to all your reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Secure password for future access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    No recurring charges
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Access from any device
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Step 3: Password Entry */}
          {step === 'password' && (
            <>
              {!isReturningUser && generatedPassword && (
                <Alert className="bg-green-50 border-green-300">
                  <Key className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>Your Access Password:</strong>
                    <div className="mt-2 p-3 bg-white rounded border border-green-300 font-mono text-xl text-center font-bold">
                      {generatedPassword}
                    </div>
                    <p className="mt-2 text-xs">
                      Save this password! You'll need it for future access. (Also check console for details)
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {isReturningUser && (
                <Alert className="bg-blue-50 border-blue-300">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Welcome back! Enter the password from your first payment.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Access Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="text"
                    placeholder="HR-XXXX-XXXX"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.toUpperCase())}
                    className="pl-10 font-mono text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    autoFocus
                  />
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security Note */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <Lock className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
              <span>
                Secure payment via Razorpay. Your password is stored locally on your device.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step !== 'credentials' && (
            <Button variant="outline" onClick={handleBack} disabled={loading} className="w-full sm:w-auto" >
              Back
            </Button>
          )}
          
          {step === 'credentials' && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckCredentials}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                Continue
              </Button>
            </>
          )}

          {step === 'payment' && (
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay ₹{amount} & Get Password
                </>
              )}
            </Button>
          )}

          {step === 'password' && (
            <Button
              onClick={handlePasswordSubmit}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <Key className="w-4 h-4 mr-2" />
              Access Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
