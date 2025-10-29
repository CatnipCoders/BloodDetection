"use client"

import { useState } from "react"
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

  const handleScan = () => {
    setIsScanning(true)
    setScanComplete(false)
    setDetectedBloodGroup(null)

    // Simulate scanning process
    setTimeout(() => {
      const randomBloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)]

      setDetectedBloodGroup(randomBloodGroup)
      setIsScanning(false)
      setScanComplete(true)
    }, 3500)
  }

  const handleReset = () => {
    setIsScanning(false)
    setScanComplete(false)
    setDetectedBloodGroup(null)
  }

  const handleSaveResult = () => {
    if (!detectedBloodGroup) return

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
                </div>
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

                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={handleReset} variant="outline" className="w-full bg-transparent">
                      Scan Again
                    </Button>
                    <Button onClick={handleSaveResult} className="w-full bg-green-600 hover:bg-green-700">
                      {existingUserId ? "Save Result" : "Continue to Registration"}
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
