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
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Info, Activity, Droplet, User as UserIcon, FileText } from "lucide-react"
import { generateHealthReport, type HealthReport } from "@/lib/health-report"
import { getUserCompleteData, hasCompleteData } from "@/lib/api-client"

export default function ReportPage() {
  const searchParams = useSearchParams()
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [dataStatus, setDataStatus] = useState<{
    hasBloodGroup: boolean
    hasVitals: boolean
    isComplete: boolean
  } | null>(null)

  // Check if userId is provided in URL
  useEffect(() => {
    const userIdParam = searchParams.get("userId")
    if (userIdParam) {
      setUserId(userIdParam)
      handleGenerateReport(userIdParam)
    }
  }, [searchParams])

  const handleGenerateReport = async (userIdToUse?: string) => {
    const targetUserId = userIdToUse || userId
    
    if (!targetUserId.trim()) {
      setError("Please enter your Patient ID")
      return
    }

    setLoading(true)
    setError(null)
    setReport(null)

    try {
      // Check if user has complete data
      const status = await hasCompleteData(targetUserId)
      setDataStatus(status)

      if (!status.isComplete) {
        const missing = []
        if (!status.hasBloodGroup) missing.push("Blood Group")
        if (!status.hasVitals) missing.push("Vital Signs")
        
        setError(
          `Cannot generate report: Missing ${missing.join(" and ")}. ` +
          `Please complete ${!status.hasBloodGroup ? "fingerprint scan" : ""}${!status.hasBloodGroup && !status.hasVitals ? " and " : ""}${!status.hasVitals ? "vitals monitoring" : ""} first.`
        )
        setLoading(false)
        return
      }

      // Fetch complete user data
      const userData = await getUserCompleteData(targetUserId)

      if (!userData) {
        setError("Patient ID not found")
        setLoading(false)
        return
      }

      setUserName(userData.name)

      // Generate report
      const generatedReport = generateHealthReport({
        bloodGroup: userData.blood_group,
        spo2: userData.latest_vitals.spo2,
        heartRate: userData.latest_vitals.heart_rate,
        perfusionIndex: userData.latest_vitals.perfusion_index || 2.5,
        userName: userData.name,
      })

      setReport(generatedReport)
      setLoading(false)
    } catch (error: any) {
      console.error("Error generating report:", error)
      setError(error.message || "Failed to generate report")
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (!report) return

    // Import jsPDF dynamically
    import("jspdf").then(({ default: jsPDF }) => {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 20

      // Title
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("Health Report", pageWidth / 2, yPos, { align: "center" })
      yPos += 15

      // Patient Info
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Patient: ${userName}`, 20, yPos)
      yPos += 7
      doc.text(`Patient ID: ${userId}`, 20, yPos)
      yPos += 7
      doc.text(`Report ID: ${report.reportId}`, 20, yPos)
      yPos += 7
      doc.text(`Generated: ${new Date(report.timestamp).toLocaleString()}`, 20, yPos)
      yPos += 15

      // Blood Group
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Blood Group", 20, yPos)
      yPos += 7
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(report.bloodGroup, 20, yPos)
      yPos += 15

      // Vital Signs
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Vital Signs", 20, yPos)
      yPos += 7
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`SpO2: ${report.spo2}% (${report.spo2Status})`, 20, yPos)
      yPos += 7
      doc.text(`Heart Rate: ${report.heartRate} BPM (${report.heartRateStatus})`, 20, yPos)
      yPos += 7
      doc.text(`Perfusion Index: ${report.perfusionIndex}%`, 20, yPos)
      yPos += 15

      // Overall Status
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Overall Status", 20, yPos)
      yPos += 7
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Severity: ${report.overallStatus.severity}`, 20, yPos)
      yPos += 7
      
      // Summary (wrap text)
      const summaryLines = doc.splitTextToSize(report.overallStatus.summary, pageWidth - 40)
      doc.text(summaryLines, 20, yPos)
      yPos += summaryLines.length * 7 + 10

      // Critical Alert
      if (report.criticalAlert) {
        doc.setTextColor(255, 0, 0)
        doc.setFont("helvetica", "bold")
        doc.text("CRITICAL ALERT:", 20, yPos)
        yPos += 7
        doc.setFont("helvetica", "normal")
        const alertLines = doc.splitTextToSize(report.criticalAlert, pageWidth - 40)
        doc.text(alertLines, 20, yPos)
        doc.setTextColor(0, 0, 0)
      }

      // Save PDF
      doc.save(`health-report-${userId}-${Date.now()}.pdf`)
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "NORMAL":
        return "bg-green-100 text-green-800 border-green-300"
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "NORMAL":
        return <CheckCircle className="w-5 h-5" />
      case "WARNING":
        return <Info className="w-5 h-5" />
      case "CRITICAL":
        return <AlertTriangle className="w-5 h-5" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Patient ID Input */}
          {!report && (
            <Card className="border-blue-100 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-6 h-6" />
                  Generate Health Report
                </CardTitle>
                <CardDescription>
                  Enter your Patient ID to generate a comprehensive health report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Patient ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="userId"
                      type="text"
                      placeholder="Enter your Patient ID (e.g., P001)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value.toUpperCase())}
                      className="font-mono flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateReport()}
                    />
                    <Button 
                      onClick={() => handleGenerateReport()}
                      disabled={loading}
                    >
                      {loading ? "Generating..." : "Generate Report"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Don't have a Patient ID? <Link href="/scan" className="text-blue-600 hover:underline">Register here</Link>
                  </p>
                </div>

                {/* Data Status */}
                {dataStatus && !dataStatus.isComplete && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Data Completion Status:</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        {dataStatus.hasBloodGroup ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span>Blood Group: {dataStatus.hasBloodGroup ? "Complete" : "Missing"}</span>
                        {!dataStatus.hasBloodGroup && (
                          <Link href="/scan" className="text-blue-600 hover:underline text-xs">
                            → Scan now
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {dataStatus.hasVitals ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span>Vital Signs: {dataStatus.hasVitals ? "Complete" : "Missing"}</span>
                        {!dataStatus.hasVitals && (
                          <Link href="/vitals" className="text-blue-600 hover:underline text-xs">
                            → Monitor now
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-900">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Health Report Display */}
          {report && (
            <>
              {/* Header Card */}
              <Card className="border-blue-100 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Health Report
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Patient: <span className="font-semibold">{userName}</span> (ID: {userId})
                      </CardDescription>
                      <CardDescription>
                        Report ID: {report.reportId}
                      </CardDescription>
                      <CardDescription>
                        Generated: {new Date(report.timestamp).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Critical Alert */}
              {report.criticalAlert && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-900 font-semibold">
                    CRITICAL ALERT: {report.criticalAlert}
                  </AlertDescription>
                </Alert>
              )}

              {/* Overall Status */}
              <Card className={`border-2 ${getSeverityColor(report.overallStatus.severity)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getSeverityIcon(report.overallStatus.severity)}
                    Overall Health Status: {report.overallStatus.severity}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{report.overallStatus.summary}</p>
                </CardContent>
              </Card>

              {/* Vital Signs */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Blood Group */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Droplet className="w-5 h-5 text-red-600" />
                      Blood Group
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-red-600 text-center">
                      {report.bloodGroup}
                    </div>
                  </CardContent>
                </Card>

                {/* SpO2 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      Blood Oxygen (SpO2)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">
                        {report.spo2}%
                      </div>
                      <Badge className="mt-2" variant={report.spo2Status === "NORMAL" ? "default" : "destructive"}>
                        {report.spo2Status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Heart Rate */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-red-600" />
                      Heart Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600">
                        {report.heartRate}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">BPM</div>
                      <Badge className="mt-2" variant={report.heartRateStatus === "NORMAL" ? "default" : "destructive"}>
                        {report.heartRateStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Perfusion Index */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Perfusion Index</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-600">
                        {report.perfusionIndex}%
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Signal Quality</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {report.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Precautions */}
              {report.precautions && report.precautions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Precautions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {report.precautions.map((precaution, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{precaution}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Blood Group Information */}
              {report.bloodGroupInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>Blood Group Information - {report.bloodGroup}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Dietary Recommendations:</h4>
                      <p className="text-sm text-gray-700">{report.bloodGroupInfo.dietaryRecommendations}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Health Considerations:</h4>
                      <p className="text-sm text-gray-700">{report.bloodGroupInfo.healthConsiderations}</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Can Donate To:</h4>
                        <div className="flex flex-wrap gap-1">
                          {report.bloodGroupInfo.canDonateTo.map((bg, index) => (
                            <Badge key={index} variant="outline">{bg}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Can Receive From:</h4>
                        <div className="flex flex-wrap gap-1">
                          {report.bloodGroupInfo.canReceiveFrom.map((bg, index) => (
                            <Badge key={index} variant="outline">{bg}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Button 
                  onClick={() => {
                    setReport(null)
                    setUserId("")
                    setError(null)
                    setDataStatus(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Generate New Report
                </Button>
                <Button 
                  onClick={handleExportPDF}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as PDF
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
