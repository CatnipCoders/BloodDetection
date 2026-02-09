"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Activity, Heart, CheckCircle2, AlertCircle, RefreshCcw, Wifi, WifiOff, FileText } from "lucide-react"

interface VitalSigns {
  spo2: number | null
  heartRate: number | null
  fingerDetected?: boolean
  dataValid?: boolean
}

export default function VitalsPage() {
  const router = useRouter()
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({ spo2: null, heartRate: null })
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [history, setHistory] = useState<VitalSigns[]>([])
  const [perfusionIndex, setPerfusionIndex] = useState<number>(2.5)
  
  // Patient management state
  const [existingUserId, setExistingUserId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientEmail, setPatientEmail] = useState("")
  const [isNewPatient, setIsNewPatient] = useState(false)
  const [currentPatient, setCurrentPatient] = useState<{ id: number; name: string } | null>(null)

  // Fetch vital signs from ESP32 gateway
  useEffect(() => {
    // Load current patient from localStorage if available
    const storedUserId = localStorage.getItem("currentUserId")
    const storedUserName = localStorage.getItem("userName")
    if (storedUserId && storedUserName) {
      setCurrentPatient({ id: parseInt(storedUserId), name: storedUserName })
      setExistingUserId(storedUserId)
    }

    const ESP32_API_URL = process.env.NEXT_PUBLIC_ESP32_API_URL ?? "http://192.168.1.193/api/vitals"
    let intervalId: NodeJS.Timeout

    const fetchVitalSigns = async () => {
      try {
        const response = await fetch(ESP32_API_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const newVitals = {
          spo2: data.spo2 ?? data.SpO2 ?? null,
          heartRate: data.heartRate ?? data.heart_rate ?? data.bpm ?? null,
          fingerDetected: data.fingerDetected ?? undefined,
          dataValid: data.dataValid ?? undefined
        }
        
        setVitalSigns(newVitals)
        setPerfusionIndex(data.perfusionIndex ?? 2.5)
        setIsConnected(true)
        setIsLoading(false)
        setError(null)
        setLastUpdate(new Date())
        
        // Store in localStorage for report generation
        if (newVitals.spo2) localStorage.setItem("lastSpO2", newVitals.spo2.toString())
        if (newVitals.heartRate) localStorage.setItem("lastHeartRate", newVitals.heartRate.toString())

        // Add to history (keep last 20 readings)
        setHistory(prev => {
          const updated = [...prev, newVitals]
          return updated.slice(-20)
        })
      } catch (error: any) {
        console.error('Failed to fetch vital signs from ESP32:', error)
        setIsConnected(false)
        setIsLoading(false)
        setError(error.message || 'Connection failed')
      }
    }

    // Initial fetch
    fetchVitalSigns()

    // Poll every 100ms for instant real-time updates
    intervalId = setInterval(fetchVitalSigns, 100)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
  }

  const handleGenerateReport = async () => {
    if (!vitalSigns.spo2 || !vitalSigns.heartRate) {
      alert("Please wait for valid vital signs data before generating a report")
      return
    }

    let userId: number | null = null

    // Handle patient creation or selection
    if (isNewPatient) {
      if (!patientName || !patientEmail) {
        alert("Please enter patient name and email")
        return
      }

      // Create new patient
      try {
        const { createUser } = await import("@/lib/api-client")
        const newUser = await createUser({
          name: patientName,
          email: patientEmail,
          blood_group: localStorage.getItem("lastBloodGroup") || "Unknown",
          confidence: 0.95,
        })

        if (newUser) {
          userId = newUser.id
          localStorage.setItem("currentUserId", userId.toString())
          localStorage.setItem("userName", newUser.name)
          setCurrentPatient({ id: userId, name: newUser.name })
        } else {
          alert("Failed to create patient. Email may already exist.")
          return
        }
      } catch (error) {
        console.error("Error creating patient:", error)
        alert("Error connecting to server")
        return
      }
    } else if (existingUserId.trim()) {
      // Use existing patient
      userId = parseInt(existingUserId)
      
      // Verify patient exists
      try {
        const { getUser } = await import("@/lib/api-client")
        const user = await getUser(userId)
        if (!user) {
          alert("Patient ID not found. Please check the ID.")
          return
        }
        localStorage.setItem("currentUserId", userId.toString())
        localStorage.setItem("userName", user.name)
        setCurrentPatient({ id: userId, name: user.name })
      } catch (error) {
        console.error("Error fetching patient:", error)
        alert("Error connecting to server")
        return
      }
    } else {
      alert("Please select an existing patient or create a new one")
      return
    }

    // Save vital signs to backend
    if (userId) {
      try {
        const { addVitalSigns } = await import("@/lib/api-client")
        await addVitalSigns(userId, {
          spo2: vitalSigns.spo2,
          heart_rate: vitalSigns.heartRate,
          perfusion_index: perfusionIndex,
        })
      } catch (error) {
        console.error("Failed to save vitals to backend:", error)
      }
    }

    // Get blood group from localStorage or prompt user
    const bloodGroup = localStorage.getItem("lastBloodGroup") || "O+"
    const userName = currentPatient?.name || localStorage.getItem("userName") || "Patient"

    // Navigate to report page with data
    router.push(
      `/report?spo2=${vitalSigns.spo2}&heartRate=${vitalSigns.heartRate}&perfusionIndex=${perfusionIndex}&bloodGroup=${bloodGroup}&userName=${encodeURIComponent(userName)}${userId ? `&userId=${userId}` : ""}`
    )
  }

  const getSpO2Status = (spo2: number) => {
    if (spo2 >= 95) return { text: 'Normal', color: 'text-green-600', bg: 'bg-green-500' }
    if (spo2 >= 90) return { text: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-500' }
    return { text: 'Critical', color: 'text-red-600', bg: 'bg-red-500' }
  }

  const getHeartRateStatus = (hr: number) => {
    if (hr >= 60 && hr <= 100) return { text: 'Normal (60-100)', color: 'text-green-600' }
    if (hr < 60) return { text: 'Bradycardia (Low)', color: 'text-blue-600' }
    return { text: 'Tachycardia (High)', color: 'text-red-600' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-600 p-4 rounded-full">
                <Activity className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Vital Signs Monitor</h1>
            <p className="text-lg text-gray-600">Real-time SpO2 and Heart Rate monitoring</p>
            
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">ESP32 Connected</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">ESP32 Disconnected</span>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Connection Error:</strong> {error}
                <br />
                <span className="text-sm">Check ESP32 device and network connection.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Patient Selection Card */}
          <Card className="mb-6 border-purple-200 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
              <CardDescription>Select existing patient or create new patient record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    Enter the patient's ID to save vitals to their record.
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
                    A new patient record will be created when you generate the report.
                  </p>
                </div>
              )}

              {currentPatient && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>Current Patient:</strong> {currentPatient.name} (ID: {currentPatient.id})
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && !isConnected && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Activity className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-900">
                Connecting to ESP32 gateway...
              </AlertDescription>
            </Alert>
          )}

          {/* Main Vital Signs Display */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* SpO2 Card */}
            <Card className="border-2 border-blue-200 shadow-lg bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Activity className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Blood Oxygen</CardTitle>
                      <CardDescription>SpO2 Level</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-6xl font-bold text-blue-600">
                    {vitalSigns.spo2 ?? '--'}
                  </span>
                  <span className="text-3xl text-gray-500">%</span>
                </div>
                
                {vitalSigns.spo2 !== null && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${getSpO2Status(vitalSigns.spo2).bg}`}
                        style={{ width: `${Math.min(vitalSigns.spo2, 100)}%` }}
                      ></div>
                    </div>
                    <p className={`text-base font-semibold ${getSpO2Status(vitalSigns.spo2).color}`}>
                      ✓ {getSpO2Status(vitalSigns.spo2).text}
                    </p>
                  </>
                )}

                {vitalSigns.spo2 === null && (
                  <p className="text-gray-400 text-sm">Waiting for sensor data...</p>
                )}
              </CardContent>
            </Card>

            {/* Heart Rate Card */}
            <Card className="border-2 border-red-200 shadow-lg bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-3 rounded-full">
                      <Heart className={`w-8 h-8 text-red-600 ${vitalSigns.heartRate ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Heart Rate</CardTitle>
                      <CardDescription>Beats per minute</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-6xl font-bold text-red-600">
                    {vitalSigns.heartRate ?? '--'}
                  </span>
                  <span className="text-3xl text-gray-500">bpm</span>
                </div>
                
                {vitalSigns.heartRate !== null && (
                  <p className={`text-base font-semibold ${getHeartRateStatus(vitalSigns.heartRate).color}`}>
                    ✓ {getHeartRateStatus(vitalSigns.heartRate).text}
                  </p>
                )}

                {vitalSigns.heartRate === null && (
                  <p className="text-gray-400 text-sm">Waiting for sensor data...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {/* Finger Detection */}
            {vitalSigns.fingerDetected !== undefined && (
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Finger Status</p>
                    <p className={`text-lg font-bold ${vitalSigns.fingerDetected ? 'text-green-600' : 'text-gray-400'}`}>
                      {vitalSigns.fingerDetected ? '✓ Detected' : '○ Not Detected'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Validity */}
            {vitalSigns.dataValid !== undefined && (
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Data Quality</p>
                    <p className={`text-lg font-bold ${vitalSigns.dataValid ? 'text-green-600' : 'text-yellow-600'}`}>
                      {vitalSigns.dataValid ? '✓ Valid' : '⚠ Calibrating'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Last Update */}
            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Last Update</p>
                  <p className="text-lg font-bold text-gray-800">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions and Actions */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>1.</strong> Place your finger gently on the MAX30105 sensor
                </p>
                <p className="text-sm text-gray-700">
                  <strong>2.</strong> Keep your finger still and relaxed
                </p>
                <p className="text-sm text-gray-700">
                  <strong>3.</strong> Wait 3-5 seconds for sensor calibration
                </p>
                <p className="text-sm text-gray-700">
                  <strong>4.</strong> Readings will update automatically every second
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleRefresh} 
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Connection
                </Button>
                <Button 
                  onClick={handleGenerateReport}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!vitalSigns.spo2 || !vitalSigns.heartRate || !vitalSigns.dataValid}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Health Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Connection Status Alert */}
          {isConnected && vitalSigns.heartRate !== null && (
            <Alert className="mt-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Monitoring Active</strong> - Real-time data streaming from ESP32 gateway
              </AlertDescription>
            </Alert>
          )}

          {!isConnected && !isLoading && (
            <Alert className="mt-6 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Connection Lost</strong> - Please check:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>ESP32 device is powered on</li>
                  <li>WiFi connection is active</li>
                  <li>Correct IP address in .env.local</li>
                  <li>Both devices are on the same network</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
