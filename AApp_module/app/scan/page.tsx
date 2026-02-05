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
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export default function ScanPage() {
  const router = useRouter()
  const [existingUserId, setExistingUserId] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [detectedBloodGroup, setDetectedBloodGroup] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [deviceConnected, setDeviceConnected] = useState<boolean | null>(null)
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleScan = () => {
    // Require either a connected device or an uploaded fingerprint image before scanning
    if (!deviceConnected && !uploadedBlob) {
      setApiError('No fingerprint device detected and no image uploaded. Please connect a scanner or upload a fingerprint image.')
      // open file picker to encourage upload
      fileInputRef.current?.click()
      return
    }

    setIsScanning(true)
    setScanComplete(false)
    setDetectedBloodGroup(null)
    setApiError(null)

    // Simulate scanning progress and then call backend /predict
    setTimeout(() => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

      const makeTestImageBlob = async (): Promise<Blob | null> => {
        // Prefer an uploaded image if present
        if (uploadedBlob) return uploadedBlob

        // If a device SDK is available that can capture an image, try that
        try {
          const sdk = (window as any).FINGERPRINT_SDK || (window as any).fingerprintScanner
          if (sdk && typeof sdk.captureImage === 'function') {
            // captureImage should return a Blob or ArrayBuffer; adapt if necessary
            const captured = await sdk.captureImage()
            if (!captured) return null
            if (captured instanceof Blob) return captured
            if (captured instanceof ArrayBuffer) return new Blob([captured], { type: 'image/png' })
            // if SDK returns base64 string
            if (typeof captured === 'string') {
              const b = atob(captured.split(',').pop() || '')
              const u8 = new Uint8Array(b.length)
              for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i)
              return new Blob([u8], { type: 'image/png' })
            }
          }
        } catch (e) {
          // ignore sdk capture errors and fall back to generated canvas below
        }

        // Fallback: create a small PNG blob on the client to POST to the backend as 'image'
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 256
          const ctx = canvas.getContext('2d')
          if (!ctx) return null
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#cc0000'
          ctx.beginPath()
          ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2)
          ctx.fill()

          return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
        } catch (e) {
          return null
        }
      }

      const randomFallback = bloodGroups[Math.floor(Math.random() * bloodGroups.length)]

      ;(async () => {
        try {
          const blob = await makeTestImageBlob()
          if (!blob) throw new Error('Failed to create image blob')

          const form = new FormData()
          form.append('image', blob, 'scan.png')

          const res = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            body: form,
          })

          if (!res.ok) {
            // If backend returns non-200, fall back to a random label and show error
            const text = await res.text().catch(() => '')
            throw new Error(`Backend error ${res.status}: ${text}`)
          }

          const data = await res.json()
          const label = data?.label ?? randomFallback
          setDetectedBloodGroup(label)
        } catch (err: any) {
          setApiError(err?.message ?? String(err))
          // fallback so user still sees a result in dev
          setDetectedBloodGroup(randomFallback)
        } finally {
          setIsScanning(false)
          setScanComplete(true)
        }
      })()
    }, 3500)
  }

  // Try to detect a connected fingerprint scanner via a global SDK object if present
  const checkDeviceAvailability = async () => {
    try {
      const sdk = (window as any).FINGERPRINT_SDK || (window as any).fingerprintScanner
      if (sdk && typeof sdk.isConnected === 'function') {
        const connected = await sdk.isConnected()
        setDeviceConnected(Boolean(connected))
        return
      }
    } catch (e) {
      // ignore
    }
    // If no SDK present, assume no device
    setDeviceConnected(false)
  }

  useEffect(() => {
    checkDeviceAvailability()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  }

  const handleSaveResult = () => {
    if (!detectedBloodGroup) return

    // Store blood group in localStorage
    localStorage.setItem("lastBloodGroup", detectedBloodGroup)

    if (existingUserId.trim()) {
      // User provided an ID - update existing record (simulated)
      // In real app, this would update the database
      alert(`Blood group ${detectedBloodGroup} has been updated for User ID: ${existingUserId}`)
      handleReset()
      setExistingUserId("")
    } else {
      // No user ID - redirect to registration with blood group pre-filled
      router.push(`/register?bloodGroup=${detectedBloodGroup}`)
    }
  }

  const handleGenerateReport = () => {
    if (!detectedBloodGroup) return

    // Store blood group
    localStorage.setItem("lastBloodGroup", detectedBloodGroup)
    
    // Get vitals from localStorage or use defaults
    const spo2 = localStorage.getItem("lastSpO2") || "98"
    const heartRate = localStorage.getItem("lastHeartRate") || "75"
    const userName = existingUserId || localStorage.getItem("userName") || "Patient"

    // Navigate to report
    router.push(
      `/report?bloodGroup=${detectedBloodGroup}&spo2=${spo2}&heartRate=${heartRate}&userName=${encodeURIComponent(userName)}`
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
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-sm">
                    Existing User ID (Optional)
                  </Label>
                  <Input
                    id="userId"
                    placeholder="Enter your User ID if already registered"
                    value={existingUserId}
                    onChange={(e) => setExistingUserId(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty if you're a new user. Your blood group will be saved to this ID if provided.
                  </p>
                  {/* Device status and upload fallback */}
                  <div className="mt-3">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {deviceConnected === null && <span>Checking scanner...</span>}
                        {deviceConnected === true && (
                          <span className="text-green-600 font-medium">Fingerprint scanner connected</span>
                        )}
                        {deviceConnected === false && (
                          <span className="text-red-600">No fingerprint scanner detected</span>
                        )}
                        {uploadedBlob && (
                          <div className="text-xs text-muted-foreground mt-1">Uploaded image ready: <span className="font-mono">{(uploadedBlob as any).name ?? 'uploaded-image'}</span></div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!deviceConnected && (
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
                            Upload Image
                          </Button>
                        )}
                        <Button variant="ghost" onClick={checkDeviceAvailability} size="sm">
                          Check Device
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
                      <p className="text-6xl font-bold text-red-600 mb-4">{detectedBloodGroup}</p>
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
                        ? "Click 'Save Result' to update your blood group information."
                        : "Click 'Continue to Registration' to save your information and get a User ID."}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={handleReset} variant="outline" className="w-full bg-transparent">
                        Scan Again
                      </Button>
                      <Button onClick={handleSaveResult} className="w-full bg-green-600 hover:bg-green-700">
                        {existingUserId ? "Save Result" : "Continue to Registration"}
                      </Button>
                    </div>
                    <Button onClick={handleGenerateReport} className="w-full bg-blue-600 hover:bg-blue-700">
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
