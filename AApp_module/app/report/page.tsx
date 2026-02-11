"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Info, Activity, Droplet, Search, User } from "lucide-react"
import { generateHealthReport, type HealthReport } from "@/lib/health-report"
import { getUserCompleteData, listUsers, type User as ApiUser } from "@/lib/api-client"

export default function ReportPage() {
  const searchParams = useSearchParams()
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [patientId, setPatientId] = useState<string>("")
  const [patients, setPatients] = useState<ApiUser[]>([])
  const [selectedPatient, setSelectedPatient] = useState<ApiUser | null>(null)
  const [showPatientSelector, setShowPatientSelector] = useState(false)

  // Load patients list
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const patientsList = await listUsers(50)
        setPatients(patientsList)
      } catch (error) {
        console.error("Error loading patients:", error)
      }
    }
    loadPatients()
  }, [])

  // Load report data
  useEffect(() => {
    const loadReportData = async () => {
      const userIdParam = searchParams.get("userId")
      
      if (userIdParam) {
        await loadPatientReport(parseInt(userIdParam))
      } else {
        // Show patient selector if no user ID provided
        setShowPatientSelector(true)
        setLoading(false)
      }
    }

    loadReportData()
  }, [searchParams])

  const loadPatientReport = async (userId: number) => {
    setLoading(true)
    try {
      const userData = await getUserCompleteData(userId)

      if (userData) {
        setSelectedPatient(userData)
        
        const bloodGroup = searchParams.get("bloodGroup") || userData.blood_group || "O+"
        const spo2 = parseFloat(
          searchParams.get("spo2") || userData.latest_vitals?.spo2?.toString() || "98"
        )
        const heartRate = parseFloat(
          searchParams.get("heartRate") || userData.latest_vitals?.heart_rate?.toString() || "75"
        )
        const perfusionIndex = parseFloat(
          searchParams.get("perfusionIndex") ||
            userData.latest_vitals?.perfusion_index?.toString() ||
            "2.5"
        )

        const generatedReport = generateHealthReport({
          bloodGroup,
          spo2,
          heartRate,
          perfusionIndex,
          userName: userData.name,
        })

        setReport(generatedReport)
        setShowPatientSelector(false)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setShowPatientSelector(true)
    }
    setLoading(false)
  }

  const handlePatientSearch = async () => {
    const userId = parseInt(patientId)
    if (isNaN(userId) || userId <= 0) {
      alert("Please enter a valid patient ID")
      return
    }
    await loadPatientReport(userId)
  }

  const handlePatientSelect = async (patient: ApiUser) => {
    setPatientId(patient.id.toString())
    await loadPatientReport(patient.id)
  }

  const handleDownloadPDF = async () => {
    if (!report) return

    try {
      const { generateProfessionalPDF } = await import("@/lib/pdf-generator")
      await generateProfessionalPDF(report, selectedPatient ? {
        id: selectedPatient.id,
        email: selectedPatient.email
      } : undefined)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 border-red-300 text-red-900"
      case "WARNING":
        return "bg-yellow-100 border-yellow-300 text-yellow-900"
      case "NORMAL":
        return "bg-green-100 border-green-300 text-green-900"
      default:
        return "bg-blue-100 border-blue-300 text-blue-900"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertTriangle className="w-6 h-6 text-red-600" />
      case "WARNING":
        return <Info className="w-6 h-6 text-yellow-600" />
      case "NORMAL":
        return <CheckCircle className="w-6 h-6 text-green-600" />
      default:
        return <Activity className="w-6 h-6 text-blue-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    )
  }

  if (showPatientSelector) {
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
            <Card className="border-blue-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" />
                  Select Patient
                </CardTitle>
                <CardDescription>
                  Enter patient ID or select from the list below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Patient ID Search */}
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="patientId"
                      type="number"
                      placeholder="Enter patient ID"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handlePatientSearch()}
                    />
                    <Button onClick={handlePatientSearch} className="bg-blue-600 hover:bg-blue-700">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>

                {/* Patients List */}
                {patients.length > 0 && (
                  <div className="space-y-2">
                    <Label>Recent Patients</Label>
                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                      {patients.map((patient) => (
                        <Card
                          key={patient.id}
                          className="cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{patient.name}</p>
                                <p className="text-sm text-gray-600">{patient.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">ID: {patient.id}</Badge>
                                  <Badge className="bg-red-100 text-red-800">
                                    {patient.blood_group}
                                  </Badge>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost">
                                View Report →
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {patients.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No patients found. Please register a patient first from the Scan or Register page.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Unable to generate health report</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
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

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="border-blue-200 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl">Health Report</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Patient: {report.patientName}
                  </CardDescription>
                  {selectedPatient && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">Patient ID: {selectedPatient.id}</Badge>
                      <Badge variant="outline">{selectedPatient.email}</Badge>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Generated: {new Date(report.timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Report ID: {report.reportId}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => setShowPatientSelector(true)}
                    variant="outline"
                    size="sm"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Change Patient
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Vital Signs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Blood Group</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{report.bloodGroup}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Blood Oxygen (SpO2)</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{report.spo2}%</p>
                  <Badge className="mt-2" variant={report.spo2Status === "Normal" ? "default" : "destructive"}>
                    {report.spo2Status}
                  </Badge>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Heart Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{report.heartRate} bpm</p>
                  <Badge className="mt-2" variant={report.heartRateStatus === "Normal" ? "default" : "destructive"}>
                    {report.heartRateStatus}
                  </Badge>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Perfusion Index</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{report.perfusionIndex}%</p>
                  <p className="text-xs text-gray-600 mt-2">Signal strength indicator</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Status */}
          <Card className={getSeverityColor(report.overallStatus.severity)}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {getSeverityIcon(report.overallStatus.severity)}
                <div>
                  <CardTitle>Health Status: {report.overallStatus.severity}</CardTitle>
                  <CardDescription className="text-current opacity-80 mt-1">
                    {report.overallStatus.summary}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Critical Alert */}
          {report.criticalAlert && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900 font-medium text-base">
                <strong>CRITICAL ALERT:</strong> {report.criticalAlert}
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Health Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Precautions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Precautions & Lifestyle Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.precautions.map((prec, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700">{prec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Blood Group Specific Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-red-600" />
                Blood Group: {report.bloodGroup} Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Compatibility</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="font-medium text-green-900 mb-1">Can Donate To:</p>
                    <p className="text-green-700">{report.bloodGroupInfo.canDonateTo.join(", ")}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="font-medium text-blue-900 mb-1">Can Receive From:</p>
                    <p className="text-blue-700">{report.bloodGroupInfo.canReceiveFrom.join(", ")}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Dietary Recommendations</h4>
                <p className="text-sm text-gray-600">{report.bloodGroupInfo.dietaryRecommendations}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Health Considerations</h4>
                <p className="text-sm text-gray-600">{report.bloodGroupInfo.healthConsiderations}</p>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Medical Disclaimer:</strong> This report is generated automatically based on vital sign measurements
              and is for informational purposes only. It does not constitute medical advice, diagnosis, or treatment.
              Always consult with a qualified healthcare professional for medical concerns.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
