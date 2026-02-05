/**
 * Health Report Generation System
 * Analyzes vital signs and blood group to generate comprehensive health reports
 */

export interface HealthReport {
  reportId: string
  timestamp: string
  patientName: string
  bloodGroup: string
  spo2: number
  spo2Status: string
  heartRate: number
  heartRateStatus: string
  perfusionIndex: number
  overallStatus: {
    severity: "NORMAL" | "WARNING" | "CRITICAL"
    summary: string
  }
  criticalAlert: string | null
  recommendations: string[]
  precautions: string[]
  bloodGroupInfo: {
    canDonateTo: string[]
    canReceiveFrom: string[]
    dietaryRecommendations: string
    healthConsiderations: string
  }
}

interface VitalSignsInput {
  bloodGroup: string
  spo2: number
  heartRate: number
  perfusionIndex: number
  userName?: string
}

// Blood group compatibility data
const BLOOD_GROUP_DATA: Record<
  string,
  {
    canDonateTo: string[]
    canReceiveFrom: string[]
    dietaryRecommendations: string
    healthConsiderations: string
  }
> = {
  "O-": {
    canDonateTo: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    canReceiveFrom: ["O-"],
    dietaryRecommendations:
      "High-protein diet with lean meats, fish, and vegetables. Avoid wheat, dairy, and processed foods. Focus on organic foods.",
    healthConsiderations:
      "Universal donor. May be prone to thyroid issues and inflammatory conditions. Regular exercise recommended.",
  },
  "O+": {
    canDonateTo: ["O+", "A+", "B+", "AB+"],
    canReceiveFrom: ["O-", "O+"],
    dietaryRecommendations:
      "High-protein diet with meat, fish, and vegetables. Limit grains and dairy. Include nuts and seeds.",
    healthConsiderations:
      "Most common blood type. Generally resilient but watch for digestive issues. Maintain active lifestyle.",
  },
  "A-": {
    canDonateTo: ["A-", "A+", "AB-", "AB+"],
    canReceiveFrom: ["O-", "A-"],
    dietaryRecommendations:
      "Vegetarian or plant-based diet ideal. Include soy, grains, vegetables, and fruits. Limit red meat and dairy.",
    healthConsiderations:
      "May have sensitive immune system. Prone to stress-related conditions. Practice stress management and meditation.",
  },
  "A+": {
    canDonateTo: ["A+", "AB+"],
    canReceiveFrom: ["O-", "O+", "A-", "A+"],
    dietaryRecommendations:
      "Vegetarian diet with organic foods. Include whole grains, legumes, and fresh vegetables. Avoid processed foods.",
    healthConsiderations:
      "Second most common type. May be susceptible to heart disease and cancer. Regular health screenings recommended.",
  },
  "B-": {
    canDonateTo: ["B-", "B+", "AB-", "AB+"],
    canReceiveFrom: ["O-", "B-"],
    dietaryRecommendations:
      "Balanced omnivorous diet. Include dairy, meat, grains, and vegetables. Avoid corn, wheat, and chicken.",
    healthConsiderations:
      "Generally strong immune system. May be prone to autoimmune disorders. Maintain balanced lifestyle.",
  },
  "B+": {
    canDonateTo: ["B+", "AB+"],
    canReceiveFrom: ["O-", "O+", "B-", "B+"],
    dietaryRecommendations:
      "Varied diet with dairy, meat, grains, and vegetables. Avoid corn, wheat, lentils, and peanuts.",
    healthConsiderations:
      "Flexible digestive system. Watch for slow metabolism. Regular physical activity important.",
  },
  "AB-": {
    canDonateTo: ["AB-", "AB+"],
    canReceiveFrom: ["O-", "A-", "B-", "AB-"],
    dietaryRecommendations:
      "Mixed diet combining A and B recommendations. Include tofu, seafood, dairy, and green vegetables.",
    healthConsiderations:
      "Rare blood type. May have sensitive digestive system. Universal plasma donor. Monitor digestive health.",
  },
  "AB+": {
    canDonateTo: ["AB+"],
    canReceiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    dietaryRecommendations:
      "Varied diet with seafood, tofu, dairy, and vegetables. Avoid caffeine and alcohol. Small frequent meals.",
    healthConsiderations:
      "Universal recipient. May have lower stomach acid. Prone to heart disease and cancer. Regular check-ups essential.",
  },
}

/**
 * Analyze SpO2 levels and return status
 */
function analyzeSpO2(spo2: number): { status: string; severity: "NORMAL" | "WARNING" | "CRITICAL" } {
  if (spo2 >= 95) {
    return { status: "Normal", severity: "NORMAL" }
  } else if (spo2 >= 90) {
    return { status: "Low (Mild Hypoxemia)", severity: "WARNING" }
  } else if (spo2 >= 85) {
    return { status: "Low (Moderate Hypoxemia)", severity: "CRITICAL" }
  } else {
    return { status: "Critically Low (Severe Hypoxemia)", severity: "CRITICAL" }
  }
}

/**
 * Analyze heart rate and return status
 */
function analyzeHeartRate(hr: number): { status: string; severity: "NORMAL" | "WARNING" | "CRITICAL" } {
  if (hr >= 60 && hr <= 100) {
    return { status: "Normal", severity: "NORMAL" }
  } else if (hr >= 50 && hr < 60) {
    return { status: "Bradycardia (Mild)", severity: "WARNING" }
  } else if (hr < 50) {
    return { status: "Bradycardia (Severe)", severity: "CRITICAL" }
  } else if (hr > 100 && hr <= 120) {
    return { status: "Tachycardia (Mild)", severity: "WARNING" }
  } else {
    return { status: "Tachycardia (Severe)", severity: "CRITICAL" }
  }
}

/**
 * Generate recommendations based on vital signs
 */
function generateRecommendations(
  spo2: number,
  heartRate: number,
  perfusionIndex: number,
  bloodGroup: string
): string[] {
  const recommendations: string[] = []

  // SpO2-based recommendations
  if (spo2 < 90) {
    recommendations.push("URGENT: Seek immediate medical attention for low oxygen levels")
    recommendations.push("Use supplemental oxygen if prescribed by your doctor")
    recommendations.push("Avoid strenuous physical activities until oxygen levels normalize")
  } else if (spo2 < 95) {
    recommendations.push("Monitor oxygen levels regularly throughout the day")
    recommendations.push("Practice deep breathing exercises (5-10 minutes, 3 times daily)")
    recommendations.push("Ensure good ventilation in your living spaces")
    recommendations.push("Consider consulting a pulmonologist if levels don't improve")
  } else {
    recommendations.push("Maintain healthy oxygen levels with regular cardiovascular exercise")
    recommendations.push("Practice breathing exercises to improve lung capacity")
  }

  // Heart rate-based recommendations
  if (heartRate < 50) {
    recommendations.push("URGENT: Consult a cardiologist immediately for severe bradycardia")
    recommendations.push("Avoid activities that may cause dizziness or fainting")
  } else if (heartRate < 60) {
    recommendations.push("Monitor heart rate regularly, especially during physical activity")
    recommendations.push("Consult your doctor if you experience dizziness or fatigue")
  } else if (heartRate > 120) {
    recommendations.push("URGENT: Seek medical evaluation for elevated heart rate")
    recommendations.push("Avoid caffeine, alcohol, and stimulants")
    recommendations.push("Practice stress-reduction techniques immediately")
  } else if (heartRate > 100) {
    recommendations.push("Reduce caffeine and stimulant intake")
    recommendations.push("Practice relaxation techniques: meditation, yoga, or deep breathing")
    recommendations.push("Ensure adequate sleep (7-9 hours per night)")
    recommendations.push("Monitor heart rate and consult doctor if it persists")
  } else {
    recommendations.push("Maintain regular cardiovascular exercise (30 minutes, 5 days/week)")
    recommendations.push("Keep stress levels manageable through relaxation techniques")
  }

  // Perfusion index recommendations
  if (perfusionIndex < 1.0) {
    recommendations.push("Improve circulation with regular movement and exercise")
    recommendations.push("Keep extremities warm to improve blood flow")
    recommendations.push("Stay well-hydrated (8-10 glasses of water daily)")
  }

  // Blood group specific recommendations
  const bgInfo = BLOOD_GROUP_DATA[bloodGroup]
  if (bgInfo) {
    recommendations.push(`Follow ${bloodGroup} blood type diet: ${bgInfo.dietaryRecommendations}`)
  }

  // General health recommendations
  recommendations.push("Maintain a balanced diet rich in fruits, vegetables, and whole grains")
  recommendations.push("Stay hydrated with at least 8 glasses of water per day")
  recommendations.push("Get regular health check-ups (at least annually)")
  recommendations.push("Avoid smoking and limit alcohol consumption")

  return recommendations
}

/**
 * Generate precautions based on vital signs
 */
function generatePrecautions(
  spo2: number,
  heartRate: number,
  perfusionIndex: number,
  bloodGroup: string
): string[] {
  const precautions: string[] = []

  // Critical precautions
  if (spo2 < 90 || heartRate < 50 || heartRate > 120) {
    precautions.push("DO NOT engage in strenuous physical activities")
    precautions.push("DO NOT ignore symptoms like chest pain, shortness of breath, or dizziness")
    precautions.push("Keep emergency contact numbers readily available")
    precautions.push("Inform family members about your condition")
  }

  // SpO2 precautions
  if (spo2 < 95) {
    precautions.push("Avoid high-altitude locations and poorly ventilated areas")
    precautions.push("Monitor for symptoms: shortness of breath, confusion, rapid breathing")
    precautions.push("Avoid exposure to air pollution and secondhand smoke")
    precautions.push("Sleep with head elevated if experiencing breathing difficulties")
  }

  // Heart rate precautions
  if (heartRate > 100) {
    precautions.push("Limit caffeine intake (coffee, tea, energy drinks)")
    precautions.push("Avoid excessive stress and anxiety-inducing situations")
    precautions.push("Monitor for palpitations, chest discomfort, or lightheadedness")
    precautions.push("Avoid hot baths or saunas that may increase heart rate")
  } else if (heartRate < 60) {
    precautions.push("Be cautious when standing up quickly to avoid dizziness")
    precautions.push("Avoid medications that may further slow heart rate without doctor approval")
    precautions.push("Monitor for fatigue, weakness, or fainting spells")
  }

  // General precautions
  precautions.push("Maintain a consistent sleep schedule (7-9 hours per night)")
  precautions.push("Avoid extreme temperatures and sudden temperature changes")
  precautions.push("Carry medical identification indicating your blood group")
  precautions.push("Keep a record of your vital signs for medical appointments")
  precautions.push("Inform your doctor about any new medications or supplements")

  // Blood group specific precautions
  const bgInfo = BLOOD_GROUP_DATA[bloodGroup]
  if (bgInfo) {
    if (bloodGroup === "O-" || bloodGroup === "AB+") {
      precautions.push("Carry blood type identification card (universal donor/recipient)")
    }
    precautions.push(`Be aware of ${bloodGroup} health considerations: ${bgInfo.healthConsiderations}`)
  }

  // Lifestyle precautions
  precautions.push("Avoid prolonged sitting; take breaks every hour to move around")
  precautions.push("Manage stress through mindfulness, meditation, or hobbies")
  precautions.push("Maintain healthy body weight through balanced diet and exercise")
  precautions.push("Limit processed foods, excessive salt, and sugar intake")

  return precautions
}

/**
 * Determine overall health status and generate summary
 */
function determineOverallStatus(
  spo2Analysis: { status: string; severity: "NORMAL" | "WARNING" | "CRITICAL" },
  hrAnalysis: { status: string; severity: "NORMAL" | "WARNING" | "CRITICAL" }
): { severity: "NORMAL" | "WARNING" | "CRITICAL"; summary: string } {
  // Critical takes precedence
  if (spo2Analysis.severity === "CRITICAL" || hrAnalysis.severity === "CRITICAL") {
    return {
      severity: "CRITICAL",
      summary:
        "Your vital signs indicate a critical condition requiring immediate medical attention. Please visit a doctor or emergency room as soon as possible.",
    }
  }

  // Warning level
  if (spo2Analysis.severity === "WARNING" || hrAnalysis.severity === "WARNING") {
    return {
      severity: "WARNING",
      summary:
        "Your vital signs show some concerning values that require monitoring. Please consult with a healthcare provider within 24-48 hours.",
    }
  }

  // Normal
  return {
    severity: "NORMAL",
    summary:
      "Your vital signs are within normal ranges. Continue maintaining a healthy lifestyle with regular exercise, balanced diet, and adequate rest.",
  }
}

/**
 * Generate critical alert message if needed
 */
function generateCriticalAlert(spo2: number, heartRate: number): string | null {
  const alerts: string[] = []

  if (spo2 < 85) {
    alerts.push(
      "SEVERE HYPOXEMIA DETECTED: Blood oxygen level is critically low. This is a medical emergency. Call emergency services (911) or go to the nearest emergency room immediately."
    )
  } else if (spo2 < 90) {
    alerts.push(
      "LOW OXYGEN LEVELS: Your blood oxygen is below safe levels. Seek medical attention within the next few hours. If you experience chest pain, severe shortness of breath, or confusion, call emergency services immediately."
    )
  }

  if (heartRate < 40) {
    alerts.push(
      "SEVERE BRADYCARDIA: Your heart rate is dangerously low. This requires immediate medical evaluation. Call emergency services or go to the ER immediately."
    )
  } else if (heartRate > 140) {
    alerts.push(
      "SEVERE TACHYCARDIA: Your heart rate is dangerously high. Seek immediate medical attention. If accompanied by chest pain, shortness of breath, or loss of consciousness, call emergency services."
    )
  }

  return alerts.length > 0 ? alerts.join(" ") : null
}

/**
 * Generate unique report ID
 */
function generateReportId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `RPT-${timestamp}-${random}`.toUpperCase()
}

/**
 * Main function to generate comprehensive health report
 */
export function generateHealthReport(input: VitalSignsInput): HealthReport {
  const { bloodGroup, spo2, heartRate, perfusionIndex, userName = "Patient" } = input

  // Analyze vital signs
  const spo2Analysis = analyzeSpO2(spo2)
  const hrAnalysis = analyzeHeartRate(heartRate)
  const overallStatus = determineOverallStatus(spo2Analysis, hrAnalysis)
  const criticalAlert = generateCriticalAlert(spo2, heartRate)

  // Generate recommendations and precautions
  const recommendations = generateRecommendations(spo2, heartRate, perfusionIndex, bloodGroup)
  const precautions = generatePrecautions(spo2, heartRate, perfusionIndex, bloodGroup)

  // Get blood group information
  const bloodGroupInfo = BLOOD_GROUP_DATA[bloodGroup] || {
    canDonateTo: ["Unknown"],
    canReceiveFrom: ["Unknown"],
    dietaryRecommendations: "Consult with a healthcare provider for personalized dietary advice.",
    healthConsiderations: "Consult with a healthcare provider for personalized health information.",
  }

  return {
    reportId: generateReportId(),
    timestamp: new Date().toISOString(),
    patientName: userName,
    bloodGroup,
    spo2,
    spo2Status: spo2Analysis.status,
    heartRate,
    heartRateStatus: hrAnalysis.status,
    perfusionIndex,
    overallStatus,
    criticalAlert,
    recommendations,
    precautions,
    bloodGroupInfo,
  }
}
