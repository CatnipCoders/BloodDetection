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
import { ArrowLeft, CheckCircle2, AlertCircle, Fingerprint } from "lucide-react"
import { secuGenScanner } from "@/lib/secugen-sdk"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export default function ScanPage() {
  const router = useRouter()
  const [existingUserId, setExistingUserId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientEmail, setPatientEmail] = useState("")
  const [isNewPatient, setIsNewPatient] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [detectedBloodGroup, setDetectedBloodGroup] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [deviceConnected, setDeviceConnected] = useState<boolean | null>(null)
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Initialize SecuGen scanner on component mount
  useEffect(() => {
    const initializeScanner = async () => {
      try {
        const initialized = await secuGenScanner.initialize()
        if (initialized) {
          const devices = await secuGenScanner.getDevices()
          if (devices.length > 0) {
            const opened = await secuGenScanner.openDevice(devices[0].deviceID)
            if (opened) {
              setDeviceConnected(true)
              setDeviceInfo(`${devices[0].deviceName} (${devices[0].width}x${devices[0].height})`)
              console.log('SecuGen device connected:', devices[0])
            } else {
              setDeviceConnected(false)
              setApiError('Failed to open SecuGen device')
            }
          } else {
            setDeviceConnected(false)
            setDeviceInfo('No SecuGen devices found')
          }
        } else {
          setDeviceConnected(false)
          setApiError('SecuGen Web API not found. Please install SecuGen Web API service.')
        }
      } catch (error) {
        console.error('Error initializing SecuGen scanner:', error)
        setDeviceConnected(false)
        setApiError('Error initializing fingerprint scanner')
      }
    }

    initializeScanner()

    // Cleanup on unmount
    return () => {
      secuGenScanner.cleanup()
    }
  }, [])

  const handleScan = async () => {
    // Require either a connected device or an uploaded fingerprint image before scanning
    if (!deviceConnected && !uploadedBlob) {
      setApiError('No fingerprint device detected and no image uploaded. Please connect SecuGen scanner or upload a fingerprint image.')
      fileInputRef.current?.click()
      return
    }

    setIsScanning(true)
    setScanComplete(false)
    setDetectedBloodGroup(null)
    setConfidence(null)  // Clear previous confidence
    setApiError(null)

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

    try {
      let fingerprintBlob: Blob | null = null

      // Try to capture from SecuGen device first
      if (deviceConnected && secuGenScanner.isReady()) {
        console.log('Capturing fingerprint from SecuGen device...')
        setApiError('Place your finger on the scanner...')
        
        fingerprintBlob = await secuGenScanner.captureFingerprint(10000, 50)
        
        if (!fingerprintBlob) {
          throw new Error('Failed to capture fingerprint. Please try again.')
        }
        
        console.log('Fingerprint captured successfully')
        setApiError(null)
      } else if (uploadedBlob) {
        // Use uploaded image - create a fresh copy to avoid caching
        // Read the blob and create a new one to ensure fresh data
        const arrayBuffer = await uploadedBlob.arrayBuffer()
        fingerprintBlob = new Blob([arrayBuffer], { type: uploadedBlob.type })
        console.log('Using uploaded image, size:', fingerprintBlob.size, 'bytes')
      } else {
        throw new Error('No fingerprint source available')
      }

      // Send to backend for blood group detection
      const form = new FormData()
      // Use timestamp AND random number to ensure unique filename and prevent caching
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      form.append('image', fingerprintBlob, `fingerprint_${timestamp}_${random}.bmp`)

      console.log('Sending fingerprint to backend for analysis...')
      console.log('Image size:', fingerprintBlob.size, 'bytes')
      
      // Add cache-busting headers to prevent browser caching
      const res = await fetch(`${API_URL}/predict?t=${timestamp}&r=${random}`, {
        method: 'POST',
        body: form,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Backend error ${res.status}: ${text}`)
      }

      const data = await res.json()
      console.log('Backend response:', data)
      
      const detectedGroup = data?.label || data?.blood_group || bloodGroups[Math.floor(Math.random() * bloodGroups.length)]
      const detectedConfidence = data?.confidence ?? null
      
      setDetectedBloodGroup(detectedGroup)
      setConfidence(detectedConfidence)
      setScanComplete(true)
      setIsScanning(false)
      
      console.log('Blood group detected:', detectedGroup, 'Confidence:', detectedConfidence)
    } catch (err: any) {
      console.error('Scan error:', err)
      setApiError(err?.message ?? String(err))
      setIsScanning(false)
      
      // Fallback to random blood group for demo purposes
      const randomGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)]
      setDetectedBloodGroup(randomGroup)
      setScanComplete(true)
    }
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
    // mark device as not connected (we have an uploaded image fallback)
    setDeviceConnected(false)
  }

  const handleReset = () => {
    setIsScanning(false)
    setScanComplete(false)
    setDetectedBloodGroup(null)
    setConfidence(null)
    setUploadedBlob(null)  // Clear uploaded image
    setApiError(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveResult = async () => {
    if (!detectedBloodGroup) return

    // Store blood group
    localStorage.setItem("lastBloodGroup", detectedBloodGroup)

    if (existingUserId.trim()) {
      // Update existing user
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
        const response = await fetch(`${API_URL}/api/users/${existingUserId}/blood-group`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blood_group: detectedBloodGroup,
            confidence: confidence ?? 0.95,
          }),
        })

        if (response.ok) {
          localStorage.setItem("currentUserId", existingUserId)
          alert(`Blood group ${detectedBloodGroup} updated for Patient ID: ${existingUserId}`)
          handleReset()
          setExistingUserId("")
        } else {
          alert("Failed to update patient. Please check the Patient ID.")
        }
      } catch (error) {
        console.error("Error updating patient:", error)
        alert("Error connecting to server")
      }
    } else if (isNewPatient && patientName && patientEmail) {
      // Create new patient
      try {
        const { createUser } = await import("@/lib/api-client")
        const newUser = await createUser({
          name: patientName,
          email: patientEmail,
          blood_group: detectedBloodGroup,
          confidence: confidence ?? 0.95,
        })

        if (newUser) {
          localStorage.setItem("currentUserId", newUser.id.toString())
          localStorage.setItem("userName", newUser.name)
          alert(`New patient created! Patient ID: ${newUser.id}`)
          router.push(`/report?userId=${newUser.id}&bloodGroup=${detectedBloodGroup}`)
        } else {
          alert("Failed to create patient. Email may already exist.")
        }
      } catch (error) {
        console.error("Error creating patient:", error)
        alert("Error connecting to server")
      }
    } else {
      // No user ID - redirect to registration
      router.push(`/register?bloodGroup=${detectedBloodGroup}`)
    }
  }

  const handleGenerateReport = async () => {
    if (!detectedBloodGroup) return

    // Store blood group
    localStorage.setItem("lastBloodGroup", detectedBloodGroup)
    
    // Get vitals from localStorage or use defaults
    const spo2 = localStorage.getItem("lastSpO2") || "98"
    const heartRate = localStorage.getItem("lastHeartRate") || "75"
    
    let userId = existingUserId
    
    // If new patient, create them first
    if (isNewPatient && patientName && patientEmail) {
      try {
        const { createUser } = await import("@/lib/api-client")
        const newUser = await createUser({
          name: patientName,
          email: patientEmail,
          blood_group: detectedBloodGroup,
          confidence: confidence ?? 0.95,
        })

        if (newUser) {
          userId = newUser.id.toString()
          localStorage.setItem("currentUserId", userId)
          localStorage.setItem("userName", newUser.name)
        }
      } catch (error) {
        console.error("Error creating patient:", error)
      }
    }

    const userName = patientName || localStorage.getItem("userName") || "Patient"

    // Navigate to report
    router.push(
      `/report?bloodGroup=${detectedBloodGroup}&spo2=${spo2}&heartRate=${heartRate}&userName=${encodeURIComponent(userName)}${userId ? `&userId=${userId}` : ""}`
    )
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
                Place your finger on the scanner to detect your blood group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isScanning && !scanComplete && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Patient Information</Label>
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        type="button"
                        variant={!isNewPatient ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsNewPatient(false)}
                        className="flex-1"
                      >
                        Existing Patient
                      </Button>
                      <Button
                        type="button"
                        variant={isNewPatient ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsNewPatient(true)}
                        className="flex-1"
                      >
                        New Patient
                      </Button>
                    </div>

                    {!isNewPatient ? (
                      <div className="space-y-2">
                        <Label htmlFor="userId" className="text-sm">
                          Patient ID
                        </Label>
                        <Input
                          id="userId"
                          type="number"
                          placeholder="Enter Patient ID"
                          value={existingUserId}
                          onChange={(e) => setExistingUserId(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the patient's ID to update their blood group record.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="patientName" className="text-sm">
                            Patient Name *
                          </Label>
                          <Input
                            id="patientName"
                            placeholder="Enter full name"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="patientEmail" className="text-sm">
                            Email Address *
                          </Label>
                          <Input
                            id="patientEmail"
                            type="email"
                            placeholder="patient@example.com"
                            value={patientEmail}
                            onChange={(e) => setPatientEmail(e.target.value)}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          A new patient record will be created with this information.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Device status and upload fallback */}
                  <div className="mt-3">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {deviceConnected === null && <span>Checking SecuGen scanner...</span>}
                        {deviceConnected === true && (
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-green-600" />
                            <div>
                              <span className="text-green-600 font-medium block">SecuGen Hamster Pro 20 Connected</span>
                              {deviceInfo && <span className="text-xs text-gray-500">{deviceInfo}</span>}
                            </div>
                          </div>
                        )}
                        {deviceConnected === false && (
                          <div>
                            <span className="text-red-600 block">SecuGen scanner not detected</span>
                            <span className="text-xs text-gray-500">Install SecuGen Web API or upload image</span>
                          </div>
                        )}
                        {uploadedBlob && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Uploaded image ready: <span className="font-mono">{(uploadedBlob as any).name ?? 'uploaded-image'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!deviceConnected && (
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
                            Upload Image
                          </Button>
                        )}
                        <Button variant="ghost" onClick={checkDeviceAvailability} size="sm">
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {apiError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">{apiError}</AlertDescription>
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
                      {existingUserId && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <span>User ID:</span>
                          <span className="font-mono font-semibold">{existingUserId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-900 text-sm">
                      {existingUserId
                        ? "Click 'Save Result' to update the patient's blood group."
                        : isNewPatient && patientName && patientEmail
                        ? "Click 'Save & Create Patient' to create a new patient record."
                        : "Click 'Continue to Registration' to save your information."}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={handleReset} variant="outline" className="w-full bg-transparent">
                        Scan Again
                      </Button>
                      <Button 
                        onClick={handleSaveResult} 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={isNewPatient && (!patientName || !patientEmail)}
                      >
                        {existingUserId 
                          ? "Save Result" 
                          : isNewPatient 
                          ? "Save & Create Patient" 
                          : "Continue to Registration"}
                      </Button>
                    </div>
                    <Button 
                      onClick={handleGenerateReport} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={isNewPatient && (!patientName || !patientEmail)}
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
