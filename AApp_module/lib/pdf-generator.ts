/**
 * Professional PDF Generator for Health Reports
 * Creates well-formatted, medical-grade PDF reports
 */

import type { HealthReport } from "./health-report"

export async function generateProfessionalPDF(
  report: HealthReport,
  patientData?: { id: number; email: string }
) {
  const { default: jsPDF } = await import("jspdf")
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPos = margin

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Helper function to draw a box
  const drawBox = (x: number, y: number, width: number, height: number, fillColor?: [number, number, number]) => {
    if (fillColor) {
      doc.setFillColor(...fillColor)
      doc.rect(x, y, width, height, "F")
    }
    doc.setDrawColor(200, 200, 200)
    doc.rect(x, y, width, height, "S")
  }

  // ===== HEADER =====
  // Logo/Title area with colored background
  doc.setFillColor(37, 99, 235) // Blue
  doc.rect(0, 0, pageWidth, 40, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("HEALTH REPORT", pageWidth / 2, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Comprehensive Vital Signs Analysis", pageWidth / 2, 30, { align: "center" })

  yPos = 50

  // ===== PATIENT INFORMATION SECTION =====
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("PATIENT INFORMATION", margin, yPos)
  yPos += 8

  // Patient info box
  drawBox(margin, yPos, contentWidth, 35, [249, 250, 251])
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  yPos += 8

  const patientInfo = [
    [`Patient Name:`, report.patientName],
    [`Patient ID:`, patientData?.id ? `#${patientData.id}` : "N/A"],
    [`Email:`, patientData?.email || "N/A"],
    [`Report ID:`, report.reportId],
    [`Generated:`, new Date(report.timestamp).toLocaleString()],
  ]

  patientInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold")
    doc.text(label, margin + 5, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(value, margin + 45, yPos)
    yPos += 6
  })

  yPos += 10

  // ===== VITAL SIGNS SECTION =====
  checkNewPage(80)
  
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("VITAL SIGNS SUMMARY", margin, yPos)
  yPos += 10

  // Create 4 boxes for vital signs
  const boxWidth = (contentWidth - 10) / 2
  const boxHeight = 30

  // Blood Group Box
  drawBox(margin, yPos, boxWidth, boxHeight, [254, 226, 226])
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("BLOOD GROUP", margin + 5, yPos + 7)
  doc.setFontSize(20)
  doc.setTextColor(220, 38, 38)
  doc.setFont("helvetica", "bold")
  doc.text(report.bloodGroup, margin + 5, yPos + 20)

  // SpO2 Box
  const spo2Color = report.spo2 >= 95 ? [34, 197, 94] : report.spo2 >= 90 ? [234, 179, 8] : [239, 68, 68]
  drawBox(margin + boxWidth + 5, yPos, boxWidth, boxHeight, [219, 234, 254])
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("BLOOD OXYGEN (SpO2)", margin + boxWidth + 10, yPos + 7)
  doc.setFontSize(20)
  doc.setTextColor(...spo2Color)
  doc.text(`${report.spo2}%`, margin + boxWidth + 10, yPos + 20)
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(report.spo2Status, margin + boxWidth + 10, yPos + 26)

  yPos += boxHeight + 5

  // Heart Rate Box
  const hrColor = report.heartRate >= 60 && report.heartRate <= 100 ? [34, 197, 94] : [239, 68, 68]
  drawBox(margin, yPos, boxWidth, boxHeight, [243, 232, 255])
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("HEART RATE", margin + 5, yPos + 7)
  doc.setFontSize(20)
  doc.setTextColor(...hrColor)
  doc.text(`${report.heartRate}`, margin + 5, yPos + 20)
  doc.setFontSize(10)
  doc.text("bpm", margin + 30, yPos + 20)
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(report.heartRateStatus, margin + 5, yPos + 26)

  // Perfusion Index Box
  drawBox(margin + boxWidth + 5, yPos, boxWidth, boxHeight, [220, 252, 231])
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("PERFUSION INDEX", margin + boxWidth + 10, yPos + 7)
  doc.setFontSize(20)
  doc.setTextColor(34, 197, 94)
  doc.text(`${report.perfusionIndex}%`, margin + boxWidth + 10, yPos + 20)
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("Signal Strength", margin + boxWidth + 10, yPos + 26)

  yPos += boxHeight + 15

  // ===== HEALTH STATUS SECTION =====
  checkNewPage(40)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("HEALTH STATUS", margin, yPos)
  yPos += 10

  // Status box with color based on severity
  const statusColors: Record<string, [number, number, number]> = {
    NORMAL: [220, 252, 231],
    WARNING: [254, 249, 195],
    CRITICAL: [254, 226, 226],
  }
  const statusTextColors: Record<string, [number, number, number]> = {
    NORMAL: [22, 163, 74],
    WARNING: [161, 98, 7],
    CRITICAL: [220, 38, 38],
  }

  drawBox(margin, yPos, contentWidth, 25, statusColors[report.overallStatus.severity])
  
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...statusTextColors[report.overallStatus.severity])
  doc.text(`STATUS: ${report.overallStatus.severity}`, margin + 5, yPos + 8)
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  const summaryLines = doc.splitTextToSize(report.overallStatus.summary, contentWidth - 10)
  doc.text(summaryLines, margin + 5, yPos + 16)
  
  yPos += 25 + summaryLines.length * 2 + 10

  // ===== CRITICAL ALERT (if any) =====
  if (report.criticalAlert) {
    checkNewPage(30)
    
    drawBox(margin, yPos, contentWidth, 20, [254, 226, 226])
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(220, 38, 38)
    doc.text("⚠ CRITICAL ALERT", margin + 5, yPos + 7)
    
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    const alertLines = doc.splitTextToSize(report.criticalAlert, contentWidth - 10)
    doc.text(alertLines, margin + 5, yPos + 14)
    
    yPos += 20 + alertLines.length * 3 + 10
  }

  // ===== RECOMMENDATIONS SECTION =====
  checkNewPage(60)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("HEALTH RECOMMENDATIONS", margin, yPos)
  yPos += 10

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)

  report.recommendations.forEach((rec, idx) => {
    checkNewPage(15)
    
    // Number circle
    doc.setFillColor(34, 197, 94)
    doc.circle(margin + 3, yPos - 2, 3, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(`${idx + 1}`, margin + 3, yPos, { align: "center" })
    
    // Recommendation text
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    const recLines = doc.splitTextToSize(rec, contentWidth - 15)
    doc.text(recLines, margin + 10, yPos)
    yPos += recLines.length * 5 + 3
  })

  yPos += 10

  // ===== PRECAUTIONS SECTION =====
  checkNewPage(60)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("PRECAUTIONS & LIFESTYLE TIPS", margin, yPos)
  yPos += 10

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)

  report.precautions.forEach((prec, idx) => {
    checkNewPage(15)
    
    // Number circle
    doc.setFillColor(59, 130, 246)
    doc.circle(margin + 3, yPos - 2, 3, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(`${idx + 1}`, margin + 3, yPos, { align: "center" })
    
    // Precaution text
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    const precLines = doc.splitTextToSize(prec, contentWidth - 15)
    doc.text(precLines, margin + 10, yPos)
    yPos += precLines.length * 5 + 3
  })

  yPos += 10

  // ===== BLOOD GROUP INFORMATION =====
  checkNewPage(80)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text(`BLOOD GROUP ${report.bloodGroup} INFORMATION`, margin, yPos)
  yPos += 10

  // Compatibility boxes
  const compatBoxWidth = (contentWidth - 5) / 2

  drawBox(margin, yPos, compatBoxWidth, 20, [220, 252, 231])
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(22, 163, 74)
  doc.text("CAN DONATE TO:", margin + 3, yPos + 6)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  const donateText = doc.splitTextToSize(report.bloodGroupInfo.canDonateTo.join(", "), compatBoxWidth - 6)
  doc.text(donateText, margin + 3, yPos + 12)

  drawBox(margin + compatBoxWidth + 5, yPos, compatBoxWidth, 20, [219, 234, 254])
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("CAN RECEIVE FROM:", margin + compatBoxWidth + 8, yPos + 6)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  const receiveText = doc.splitTextToSize(report.bloodGroupInfo.canReceiveFrom.join(", "), compatBoxWidth - 6)
  doc.text(receiveText, margin + compatBoxWidth + 8, yPos + 12)

  yPos += 25

  // Dietary recommendations
  checkNewPage(30)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Dietary Recommendations:", margin, yPos)
  yPos += 6
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const dietLines = doc.splitTextToSize(report.bloodGroupInfo.dietaryRecommendations, contentWidth)
  doc.text(dietLines, margin, yPos)
  yPos += dietLines.length * 5 + 8

  // Health considerations
  checkNewPage(30)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Health Considerations:", margin, yPos)
  yPos += 6
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const healthLines = doc.splitTextToSize(report.bloodGroupInfo.healthConsiderations, contentWidth)
  doc.text(healthLines, margin, yPos)
  yPos += healthLines.length * 5 + 10

  // ===== DISCLAIMER =====
  checkNewPage(30)

  drawBox(margin, yPos, contentWidth, 25, [254, 249, 195])
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(161, 98, 7)
  doc.text("MEDICAL DISCLAIMER", margin + 3, yPos + 6)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  const disclaimerText = "This report is generated automatically based on vital sign measurements and is for informational purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult with a qualified healthcare professional for medical concerns."
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 6)
  doc.text(disclaimerLines, margin + 3, yPos + 12)

  // ===== FOOTER =====
  const footerY = pageHeight - 15
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Report ID: ${report.reportId} | Generated: ${new Date(report.timestamp).toLocaleString()}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  )
  doc.text(
    "Blood Group Detection & Health Monitoring System",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  )

  // Save the PDF
  doc.save(`health-report-${report.reportId}.pdf`)
}
