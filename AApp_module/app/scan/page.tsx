"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FingerprintScanner } from "@/components/fingerprint-scanner"
import { ArrowLeft, CheckCircle2, AlertCircle, Fingerprint, User as UserIcon } from "lucide-react"
import { secuGenScanner } from "@/lib/secugen-sdk"
import { createUser, updateBloodGroup } from "@/lib/api-client"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export default function ScanPage() {
  const router = useRouter()
  
  // User mode
  const [isNewUser, setIsNewUser] = useState(false)
  
  // New user fields
  const [newUserId, setNewUserId] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserAge, setNewUserAge] = useState("")
  const [newUserGender, setNewUserGender] = useState("")
  
  // Existing user field
  const [existingUserId, setExistingUserId] = useState("")
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [detectedBloodGroup, setDetectedBloodGroup] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  
  // Device state
  const [deviceConnected, setDeviceConnected] = useState<boolean | null>(null)
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // No need for device initialization - using popup scanner
  useEffect(() => {
    setIsLoading(false)
    setDeviceConnected(true) // Always show as ready since popup handles it
    setDeviceInfo("SecuGen Scanner Ready")
  }, [])

  const generateUserId = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `P${timestamp}`
  }

  const handleScan = async () => {
    // Validate user selection
    if (!isNewUser && !existingUserId.trim()) {
      setApiError('Please enter your User ID')
      return
    }

    if (isNewUser) {
      if (!newUserId.trim() || !newUserName.trim() || !newUserEmail.trim()) {
        setApiError('Please fill in all required fields (User ID, Name, Email)')
        return
      }
      
      // Validate phone number if provided
      if (newUserPhone) {
        if (newUserPhone.length !== 10) {
          setApiError('Phone number must be exactly 10 digits')
          return
        }
        // Check if it starts with 6, 7, 8, or 9 (valid Indian mobile numbers)
        if (!/^[6-9]/.test(newUserPhone)) {
          setApiError('Invalid Indian mobile number. Must start with 6, 7, 8, or 9')
          return
        }
      }
    }

    setIsScanning(true)
    setScanComplete(false)
    setDetectedBloodGroup(null)
    setConfidence(null)
    setApiError(null)

    // Check if user uploaded an image file
    if (uploadedBlob) {
      try {
        // Use uploaded image instead of scanner
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
        const form = new FormData()
        form.append('image', uploadedBlob, (uploadedBlob as any).name || 'uploaded.bmp')

        const res = await fetch(`${API_URL}/predict`, {
          method: 'POST',
          body: form,
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`Backend error ${res.status}: ${text}`)
        }

        const data = await res.json()
        const detectedGroup = data?.label || data?.blood_group
        const detectedConfidence = data?.confidence ?? null
        
        if (!detectedGroup) {
          throw new Error('No blood group detected')
        }

        setDetectedBloodGroup(detectedGroup)
        setConfidence(detectedConfidence)
        setScanComplete(true)
        setIsScanning(false)
        setUploadedBlob(null) // Clear uploaded file
        
      } catch (err: any) {
        console.error('Upload error:', err)
        setApiError(err?.message ?? String(err))
        setIsScanning(false)
      }
      return
    }

    // Open scanner in popup (only if no uploaded file)
    const scannerWindow = window.open('/scanner.html', 'Scanner', 'width=800,height=600')
    
    if (!scannerWindow) {
      setApiError('Please allow popups for this site')
      setIsScanning(false)
      return
    }

    // Listen for fingerprint data from scanner window
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'FINGERPRINT_CAPTURED') {
        window.removeEventListener('message', handleMessage)
        scannerWindow.close()
        
        try {
          const fpData = event.data.data
          
          // Convert base64 to blob
          const base64Data = fpData.BMPBase64.replace(/^data:image\/\w+;base64,/, '')
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const fingerprintBlob = new Blob([byteArray], { type: 'image/bmp' })

          // Send to backend for blood group detection
          const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
          const form = new FormData()
          form.append('image', fingerprintBlob, 'fingerprint.bmp')

          const res = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            body: form,
          })

          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`Backend error ${res.status}: ${text}`)
          }

          const data = await res.json()
          const detectedGroup = data?.label || data?.blood_group
          const detectedConfidence = data?.confidence ?? null
          
          if (!detectedGroup) {
            throw new Error('No blood group detected')
          }

          setDetectedBloodGroup(detectedGroup)
          setConfidence(detectedConfidence)
          setScanComplete(true)
          setIsScanning(false)
          
        } catch (err: any) {
          console.error('Scan error:', err)
          setApiError(err?.message ?? String(err))
          setIsScanning(false)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    
    // Cleanup if window is closed without capturing
    const checkClosed = setInterval(() => {
      if (scannerWindow.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        if (isScanning) {
          setIsScanning(false)
          setApiError('Scanner window was closed')
        }
      }
    }, 500)
  }

  const checkDeviceAvailability = async () => {
    try {
      const initialized = await secuGenScanner.initialize()
      if (initialized) {
        const devices = await secuGenScanner.getDevices()
        if (devices.length > 0) {
          const opened = await secuGenScanner.openDevice(devices[0].deviceID)
          setDeviceConnected(opened)
          if (opened) {
            setDeviceInfo(`${devices[0].deviceName} (${devices[0].width}x${devices[0].height})`)
          }
        } else {
          setDeviceConnected(false)
          setDeviceInfo('No devices found')
        }
      } else {
        setDeviceConnected(false)
      }
    } catch (e) {
      setDeviceConnected(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    setUploadedBlob(f)
    setApiError(null)
    setDeviceConnected(false)
  }

  const handleReset = () => {
    setIsScanning(false)
    setScanComplete(false)
    setDetectedBloodGroup(null)
    setConfidence(null)
  }

  const handleSaveResult = async () => {
    if (!detectedBloodGroup) return

    try {
      if (isNewUser) {
        // Create new user first
        const newUser = await createUser({
          user_id: newUserId,
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone || undefined,
          age: newUserAge ? parseInt(newUserAge) : undefined,
          gender: newUserGender || undefined,
        })

        if (!newUser) {
          throw new Error('Failed to create user')
        }

        // Update blood group
        const updated = await updateBloodGroup(newUserId, {
          blood_group: detectedBloodGroup,
          confidence: confidence ?? undefined,
        })

        if (updated) {
          alert(`User created successfully! User ID: ${newUserId}\nBlood Group: ${detectedBloodGroup}`)
          // Reset form
          setNewUserId("")
          setNewUserName("")
          setNewUserEmail("")
          setNewUserPhone("")
          setNewUserAge("")
          setNewUserGender("")
          handleReset()
        } else {
          throw new Error('Failed to update blood group')
        }
      } else {
        // Update existing user
        const updated = await updateBloodGroup(existingUserId, {
          blood_group: detectedBloodGroup,
          confidence: confidence ?? undefined,
        })

        if (updated) {
          alert(`Blood group updated successfully for User ID: ${existingUserId}`)
          setExistingUserId("")
          handleReset()
        } else {
          throw new Error('User not found or update failed')
        }
      }
    } catch (error: any) {
      console.error('Error saving result:', error)
      setApiError(error.message || 'Failed to save result')
    }
  }

  const handleGenerateReport = () => {
    if (!detectedBloodGroup) return

    const userId = isNewUser ? newUserId : existingUserId
    if (!userId) {
      setApiError('Please save the result first')
      return
    }

    router.push(`/report?userId=${userId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <Card className="border-blue-100 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-balance">Fingerprint Blood Group Detection</CardTitle>
              <CardDescription className="text-base">
                Scan your fingerprint to detect your blood group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isScanning && !scanComplete && (
                <div className="space-y-4">
                  {/* User Mode Toggle */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Patient Type</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={!isNewUser ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsNewUser(false)}
                        className="flex-1"
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        Existing Patient
                      </Button>
                      <Button
                        type="button"
                        variant={isNewUser ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsNewUser(true)}
                        className="flex-1"
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        New Patient
                      </Button>
                    </div>
                  </div>

                  {/* Existing User Form */}
                  {!isNewUser && (
                    <div className="space-y-2">
                      <Label htmlFor="existingUserId" className="text-sm">
                        Patient ID *
                      </Label>
                      <Input
                        id="existingUserId"
                        type="text"
                        placeholder="Enter your Patient ID (e.g., P001)"
                        value={existingUserId}
                        onChange={(e) => setExistingUserId(e.target.value.toUpperCase())}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your existing Patient ID to update your blood group.
                      </p>
                    </div>
                  )}

                  {/* New User Form */}
                  {isNewUser && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="newUserId" className="text-sm">
                          Create Patient ID *
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="newUserId"
                            type="text"
                            placeholder="e.g., P001, PATIENT123"
                            value={newUserId}
                            onChange={(e) => setNewUserId(e.target.value.toUpperCase())}
                            className="font-mono flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewUserId(generateUserId())}
                          >
                            Generate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Create a unique ID for this patient. Click Generate for auto-ID.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newUserName" className="text-sm">
                          Full Name *
                        </Label>
                        <Input
                          id="newUserName"
                          placeholder="Enter full name"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newUserEmail" className="text-sm">
                          Email Address *
                        </Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          placeholder="patient@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="newUserPhone" className="text-sm">
                            Phone (Optional)
                          </Label>
                          <Input
                            id="newUserPhone"
                            type="tel"
                            placeholder="9876543210"
                            value={newUserPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                              setNewUserPhone(value)
                            }}
                            maxLength={10}
                            pattern="[6-9][0-9]{9}"
                          />
                          <p className="text-xs text-muted-foreground">
                            Must start with 6, 7, 8, or 9 (Indian mobile)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newUserAge" className="text-sm">
                            Age (Optional)
                          </Label>
                          <Input
                            id="newUserAge"
                            type="number"
                            placeholder="25"
                            value={newUserAge}
                            onChange={(e) => setNewUserAge(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newUserGender" className="text-sm">
                          Gender (Optional)
                        </Label>
                        <select
                          id="newUserGender"
                          value={newUserGender}
                          onChange={(e) => setNewUserGender(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Device Status */}
                  <div className="mt-3">
                    <input ref={fileInputRef} type="file" accept="image/*,.bmp" onChange={onFileChange} className="hidden" />
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {deviceConnected === null && <span>Checking SecuGen scanner...</span>}
                        {deviceConnected === true && (
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-green-600" />
                            <div>
                              <span className="text-green-600 font-medium block">SecuGen Connected</span>
                              {deviceInfo && <span className="text-xs text-gray-500">{deviceInfo}</span>}
                            </div>
                          </div>
                        )}
                        {deviceConnected === false && (
                          <div>
                            <span className="text-orange-600 block font-medium">Scanner not available</span>
                            <span className="text-xs text-gray-500">Use image upload to continue</span>
                          </div>
                        )}
                        {uploadedBlob && (
                          <div className="text-xs text-green-600 mt-1 font-medium">
                            ✓ Image ready: <span className="font-mono">{(uploadedBlob as any).name ?? 'uploaded'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant={!deviceConnected ? "default" : "outline"} 
                          onClick={() => fileInputRef.current?.click()} 
                          size="sm"
                          className={!deviceConnected ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          Upload Image
                        </Button>
                        {!uploadedBlob && (
                          <Button variant="ghost" onClick={checkDeviceAvailability} size="sm">
                            Refresh
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {apiError && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    {apiError}
                    {!deviceConnected && (
                      <div className="mt-2 text-sm">
                        <strong>No scanner detected.</strong> You can still use the system by uploading a fingerprint image.
                        Click the "Upload Image" button below.
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <FingerprintScanner isScanning={isScanning} scanComplete={scanComplete} />

              {!scanComplete && !isScanning && (
                <div className="text-center space-y-4">
                  <Button onClick={handleScan} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                    Start Scanning
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Ensure your finger is clean and dry for accurate results
                  </p>
                </div>
              )}

              {isScanning && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Scanning in progress... Please keep your finger steady
                  </AlertDescription>
                </Alert>
              )}

              {scanComplete && detectedBloodGroup && (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">Scan completed successfully!</AlertDescription>
                  </Alert>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border-2 border-red-200">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Detected Blood Group</p>
                      <p className="text-6xl font-bold text-red-600 mb-2">{detectedBloodGroup}</p>
                      {confidence !== null && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Prediction Accuracy</p>
                          <p className="text-2xl font-semibold text-blue-600">
                            {(confidence * 100).toFixed(2)}%
                          </p>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                              style={{ width: `${confidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <span>Patient ID:</span>
                        <span className="font-mono font-semibold">
                          {isNewUser ? newUserId : existingUserId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={handleReset} variant="outline" className="w-full">
                        Scan Again
                      </Button>
                      <Button 
                        onClick={handleSaveResult} 
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Save Result
                      </Button>
                    </div>
                    <Button 
                      onClick={handleGenerateReport} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Generate Health Report
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold mb-2 text-sm">Blood Group Information</h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {bloodGroups.map((group) => (
                <div
                  key={group}
                  className={`p-2 rounded border ${
                    detectedBloodGroup === group
                      ? "bg-red-100 border-red-300 font-semibold"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {group}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
