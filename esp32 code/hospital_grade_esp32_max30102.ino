/*
 * OPTIMIZED ESP32 + MAX30102 - Fast & Accurate Implementation
 * 
 * Key Optimizations:
 * - Reduced buffer sizes for faster response (2-3 seconds)
 * - Optimized sensor configuration for MAX30102
 * - Simplified but accurate algorithms
 * - Faster peak detection with lower latency
 * - Quick finger detection and validation
 * 
 * Hardware: ESP32 + MAX30102
 * Wiring: VIN→3.3V, GND→GND, SDA→GPIO21, SCL→GPIO22
 * 
 * Libraries: SparkFun MAX3010x Pulse and Proximity Sensor Library
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include "MAX30105.h"
#include "config.h"

// ============================================
// OPTIMIZED CONFIGURATION
// ============================================
MAX30105 particleSensor;
WebServer server(80);

// Reduced buffer for faster response (2-3 seconds instead of 10+)
const int BUFFER_SIZE = 150;              // Increased from 100 for better accuracy
const int MIN_SAMPLES_FOR_HR = 75;        // Increased from 40 - need more peaks
const int MIN_SAMPLES_FOR_SPO2 = 50;      // Increased from 25

// Peak detection optimized for speed
const int MIN_PEAK_DISTANCE = 45;         // Reduced from 50 - accept 100 BPM (0.45 seconds)
const float PEAK_THRESHOLD_FACTOR = 0.3;  // Sensitive for flat signals

// SpO2 calculation - simplified for speed
const int SPO2_SAMPLES = 20;              // Reduced from 25
const float MIN_AC_SIGNAL = 50.0;         // Reduced from 100 - more sensitive

// Signal quality - relaxed for faster readings
const float MIN_SIGNAL_QUALITY = 0.3;     // Reduced from 0.4 - more lenient
const int REQUIRED_GOOD_READINGS = 2;     // Increased from 1 - better validation

// Finger detection threshold - ADJUSTED for your sensor
const int FINGER_DETECTION_THRESHOLD = 60000;  // Lowered from 50000 in config.h

// Note: MIN_HEART_RATE and MAX_HEART_RATE are defined in config.h

// ============================================
// DATA STRUCTURES
// ============================================
struct VitalSigns {
  float heartRate;
  float spo2;
  float perfusionIndex;
  bool fingerDetected;
  bool dataValid;
  float signalQuality;
  int consecutiveGoodReadings;
};

struct SignalBuffer {
  uint32_t red[BUFFER_SIZE];
  uint32_t ir[BUFFER_SIZE];
  int index;
  bool filled;
};

// ============================================
// GLOBAL VARIABLES
// ============================================
VitalSigns vitals = {0, 0, 0, false, false, 0, 0};
SignalBuffer buffer = {{}, {}, 0, false};

// Heart rate tracking
float hrHistory[5] = {0};
int hrIndex = 0;

// SpO2 tracking
float spo2History[5] = {0};
int spo2Index = 0;

unsigned long lastSensorRead = 0;
unsigned long lastPrint = 0;
unsigned long startTime = 0;

// ============================================
// CORS & AUTH
// ============================================
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Max-Age", "600");
  server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "X-API-Key,Content-Type");
}

bool checkAuth() {
  if (!ENABLE_API_AUTH) return true;
  if (server.hasHeader("X-API-Key")) {
    String apiKey = server.header("X-API-Key");
    if (apiKey == API_KEY) return true;
  }
  server.send(401, "application/json", "{\"error\":\"Unauthorized\"}");
  return false;
}

// ============================================
// FAST SIGNAL PROCESSING
// ============================================

// Quick moving average for smoothing
float quickAverage(uint32_t* data, int start, int count) {
  float sum = 0;
  for (int i = 0; i < count; i++) {
    sum += data[(start + i) % BUFFER_SIZE];
  }
  return sum / count;
}

// Fast peak detection with better debugging
int detectPeaks(uint32_t* signal, int* peaks, int maxPeaks) {
  if (!buffer.filled && buffer.index < MIN_SAMPLES_FOR_HR) {
    if (ENABLE_SERIAL_DEBUG && buffer.index % 10 == 0) {
      Serial.print("Collecting samples: ");
      Serial.print(buffer.index);
      Serial.print("/");
      Serial.println(MIN_SAMPLES_FOR_HR);
    }
    return 0;
  }
  
  int size = buffer.filled ? BUFFER_SIZE : buffer.index;
  int peakCount = 0;
  
  // Calculate adaptive threshold quickly
  float sum = 0;
  uint32_t minVal = 999999, maxVal = 0;
  for (int i = 0; i < size; i++) {
    uint32_t val = signal[i];
    sum += val;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }
  float mean = sum / size;
  float amplitude = maxVal - minVal;
  float threshold = mean + amplitude * PEAK_THRESHOLD_FACTOR;
  
  // Debug output - MORE FREQUENT
  static unsigned long lastDebug = 0;
  if (ENABLE_SERIAL_DEBUG && millis() - lastDebug > 2000) {
    lastDebug = millis();
    Serial.println("\n=== PEAK DETECTION DEBUG ===");
    Serial.print("Signal - Min: ");
    Serial.print(minVal);
    Serial.print(", Max: ");
    Serial.print(maxVal);
    Serial.print(", Mean: ");
    Serial.print(mean, 0);
    Serial.print(", Amp: ");
    Serial.print(amplitude, 0);
    Serial.print(", Threshold: ");
    Serial.println(threshold, 0);
    Serial.print("Samples: ");
    Serial.println(size);
  }
  
  // Find peaks
  for (int i = 3; i < size - 3; i++) {  // Increased validation window
    if (signal[i] > threshold &&
        signal[i] > signal[i-1] && signal[i] > signal[i-2] &&
        signal[i] > signal[i+1] && signal[i] > signal[i+2] &&
        signal[i] >= signal[i-3] && signal[i] >= signal[i+3]) {  // Additional validation
      
      // Check distance from last peak (0.5 seconds minimum)
      if (peakCount == 0 || (i - peaks[peakCount-1]) >= MIN_PEAK_DISTANCE) {
        peaks[peakCount++] = i;
        if (ENABLE_SERIAL_DEBUG && peakCount <= 5) {
          Serial.print("  Peak #");
          Serial.print(peakCount);
          Serial.print(" at index ");
          Serial.print(i);
          Serial.print(" (");
          Serial.print(i * 0.01, 2);
          Serial.print("s), value: ");
          Serial.println(signal[i]);
        }
        if (peakCount >= maxPeaks) break;
      }
    }
  }
  
  if (ENABLE_SERIAL_DEBUG && millis() - lastDebug < 100) {
    Serial.print("Total peaks found: ");
    Serial.println(peakCount);
    Serial.println("===========================\n");
  }
  
  return peakCount;
}

// Fast heart rate calculation with median filtering and validation
float calculateHeartRate() {
  int peaks[20];
  int peakCount = detectPeaks(buffer.ir, peaks, 20);
  
  if (peakCount < 3) {  // Need at least 3 peaks for 2 intervals
    if (ENABLE_SERIAL_DEBUG && buffer.index > MIN_SAMPLES_FOR_HR) {
      static unsigned long lastWarn = 0;
      if (millis() - lastWarn > 2000) {
        lastWarn = millis();
        Serial.print("⚠ Not enough peaks detected: ");
        Serial.print(peakCount);
        Serial.println(" (need at least 3)");
      }
    }
    return 0;
  }
  
  // Calculate intervals between consecutive peaks
  float intervals[20];
  int validIntervals = 0;
  
  for (int i = 1; i < peakCount; i++) {
    int interval = peaks[i] - peaks[i-1];
    float bpm = (60.0 * SAMPLE_RATE) / interval;
    
    // Strict physiological validation (45-150 BPM for resting)
    if (bpm >= MIN_HEART_RATE && bpm <= MAX_HEART_RATE) {
      intervals[validIntervals++] = interval;
    }
  }
  
  if (validIntervals < 2) {
    if (ENABLE_SERIAL_DEBUG) {
      Serial.println("⚠ No valid intervals (all outside 45-150 BPM range)");
    }
    return 0;
  }
  
  // Sort intervals for median calculation
  for (int i = 0; i < validIntervals - 1; i++) {
    for (int j = 0; j < validIntervals - i - 1; j++) {
      if (intervals[j] > intervals[j+1]) {
        float temp = intervals[j];
        intervals[j] = intervals[j+1];
        intervals[j+1] = temp;
      }
    }
  }
  
  // Calculate median interval (more robust than mean)
  float medianInterval;
  if (validIntervals % 2 == 0) {
    medianInterval = (intervals[validIntervals/2 - 1] + intervals[validIntervals/2]) / 2.0;
  } else {
    medianInterval = intervals[validIntervals/2];
  }
  
  float instantBpm = (60.0 * SAMPLE_RATE) / medianInterval;
  
  // Smoothing with history (weighted moving average)
  hrHistory[hrIndex] = instantBpm;
  hrIndex = (hrIndex + 1) % 5;
  
  float sum = 0;
  int count = 0;
  for (int i = 0; i < 5; i++) {
    if (hrHistory[i] > 0) {
      sum += hrHistory[i];
      count++;
    }
  }
  
  float result = count > 0 ? sum / count : 0;
  
  // Final validation
  if (result < MIN_HEART_RATE || result > MAX_HEART_RATE) {
    if (ENABLE_SERIAL_DEBUG) {
      Serial.print("⚠ HR out of range: ");
      Serial.println(result, 1);
    }
    return 0;
  }
  
  if (ENABLE_SERIAL_DEBUG && result > 0) {
    static unsigned long lastHRDebug = 0;
    if (millis() - lastHRDebug > 2000) {
      lastHRDebug = millis();
      Serial.print("✓ HR calculated: ");
      Serial.print(result, 1);
      Serial.print(" bpm (from ");
      Serial.print(peakCount);
      Serial.print(" peaks, ");
      Serial.print(validIntervals);
      Serial.println(" valid intervals)");
    }
  }
  
  return result;
}

// Fast SpO2 calculation
float calculateSpO2() {
  if (!buffer.filled && buffer.index < MIN_SAMPLES_FOR_SPO2) return 0;
  
  int size = buffer.filled ? BUFFER_SIZE : buffer.index;
  
  // Calculate DC and AC components quickly
  float dcRed = 0, dcIR = 0;
  for (int i = 0; i < size; i++) {
    dcRed += buffer.red[i];
    dcIR += buffer.ir[i];
  }
  dcRed /= size;
  dcIR /= size;
  
  // Quick AC calculation (RMS)
  float acRed = 0, acIR = 0;
  for (int i = 0; i < size; i++) {
    float diffRed = buffer.red[i] - dcRed;
    float diffIR = buffer.ir[i] - dcIR;
    acRed += diffRed * diffRed;
    acIR += diffIR * diffIR;
  }
  acRed = sqrt(acRed / size);
  acIR = sqrt(acIR / size);
  
  // Validate signal strength
  if (dcRed < 5000 || dcIR < 5000 || acRed < MIN_AC_SIGNAL || acIR < MIN_AC_SIGNAL) {
    return 0;
  }
  
  // Calculate perfusion index
  vitals.perfusionIndex = (acIR / dcIR) * 100.0;
  
  // Calculate R ratio
  float R = (acRed / dcRed) / (acIR / dcIR);
  
  // Validate R range
  if (R < 0.3 || R > 2.5) return 0;
  
  // Calibrated SpO2 formula (optimized coefficients)
  float spo2 = 110.0 - 25.0 * R;
  
  // Clamp to valid range
  if (spo2 > 100.0) spo2 = 100.0;
  if (spo2 < 70.0) return 0;
  
  // Simple smoothing
  spo2History[spo2Index] = spo2;
  spo2Index = (spo2Index + 1) % 5;
  
  float sum = 0;
  int count = 0;
  for (int i = 0; i < 5; i++) {
    if (spo2History[i] > 0) {
      sum += spo2History[i];
      count++;
    }
  }
  
  return count > 0 ? sum / count : 0;
}

// Quick signal quality check
float calculateSignalQuality() {
  if (!buffer.filled && buffer.index < 20) return 0;
  
  int size = min(buffer.index, BUFFER_SIZE);
  
  // Check signal amplitude
  float minIR = 999999, maxIR = 0;
  for (int i = 0; i < size; i++) {
    if (buffer.ir[i] < minIR) minIR = buffer.ir[i];
    if (buffer.ir[i] > maxIR) maxIR = buffer.ir[i];
  }
  
  float amplitude = maxIR - minIR;
  float ampScore = min(1.0f, amplitude / 1000.0f);
  
  // Check perfusion
  float perfScore = min(1.0f, vitals.perfusionIndex / 3.0f);
  
  return (ampScore * 0.6f + perfScore * 0.4f);
}

// ============================================
// SENSOR READING WITH ENHANCED DEBUGGING
// ============================================
void readSensor() {
  uint32_t irValue = particleSensor.getIR();
  uint32_t redValue = particleSensor.getRed();
  
  // Enhanced finger detection with feedback
  if (irValue < FINGER_DETECTION_THRESHOLD) {
    static unsigned long lastNoFingerMsg = 0;
    if (ENABLE_SERIAL_DEBUG && millis() - lastNoFingerMsg > 3000) {
      lastNoFingerMsg = millis();
      Serial.print("👆 No finger detected (IR: ");
      Serial.print(irValue);
      Serial.print(" < threshold: ");
      Serial.print(FINGER_DETECTION_THRESHOLD);
      Serial.println(")");
      Serial.println("   Place finger FIRMLY on sensor");
    }
    
    vitals.fingerDetected = false;
    vitals.dataValid = false;
    vitals.heartRate = 0;
    vitals.spo2 = 0;
    vitals.signalQuality = 0;
    vitals.perfusionIndex = 0;
    vitals.consecutiveGoodReadings = 0;
    
    // Reset buffer
    buffer.index = 0;
    buffer.filled = false;
    
    return;
  }
  
  // Finger detected!
  if (!vitals.fingerDetected && ENABLE_SERIAL_DEBUG) {
    Serial.println("\n✓ Finger detected! Collecting data...");
  }
  vitals.fingerDetected = true;
  
  // Store in buffer
  buffer.red[buffer.index] = redValue;
  buffer.ir[buffer.index] = irValue;
  buffer.index++;
  
  if (buffer.index >= BUFFER_SIZE) {
    buffer.index = 0;
    buffer.filled = true;
    if (ENABLE_SERIAL_DEBUG) {
      Serial.println("✓ Buffer filled, continuous monitoring active");
    }
  }
  
  // Start calculating after minimum samples
  if (!buffer.filled && buffer.index < MIN_SAMPLES_FOR_HR) {
    // Show progress every 10 samples
    if (ENABLE_SERIAL_DEBUG && buffer.index % 10 == 0) {
      Serial.print("Collecting: ");
      Serial.print(buffer.index);
      Serial.print("/");
      Serial.print(MIN_SAMPLES_FOR_HR);
      Serial.print(" samples (IR: ");
      Serial.print(irValue);
      Serial.print(", Red: ");
      Serial.print(redValue);
      Serial.println(")");
    }
    return;
  }
  
  // Calculate vitals
  float hr = calculateHeartRate();
  float spo2 = calculateSpO2();
  float quality = calculateSignalQuality();
  
  vitals.signalQuality = quality;
  
  // Debug signal quality
  static unsigned long lastQualityDebug = 0;
  if (ENABLE_SERIAL_DEBUG && millis() - lastQualityDebug > 3000) {
    lastQualityDebug = millis();
    Serial.print("Signal Quality: ");
    Serial.print(quality * 100, 0);
    Serial.print("% (need ");
    Serial.print(MIN_SIGNAL_QUALITY * 100, 0);
    Serial.println("%)");
  }
  
  // Quick validation
  if (quality >= MIN_SIGNAL_QUALITY && hr >= MIN_HEART_RATE && hr <= MAX_HEART_RATE) {
    vitals.heartRate = hr;
    vitals.consecutiveGoodReadings++;
    
    if (vitals.consecutiveGoodReadings >= REQUIRED_GOOD_READINGS) {
      vitals.dataValid = true;
      if (ENABLE_SERIAL_DEBUG && vitals.consecutiveGoodReadings == REQUIRED_GOOD_READINGS) {
        Serial.println("\n✓✓✓ VALID READINGS ACHIEVED! ✓✓✓\n");
      }
    }
  } else {
    if (ENABLE_SERIAL_DEBUG && hr > 0) {
      Serial.print("⚠ Reading rejected - Quality: ");
      Serial.print(quality * 100, 0);
      Serial.print("%, HR: ");
      Serial.println(hr, 1);
    }
  }
  
  if (spo2 >= MIN_SPO2 && spo2 <= MAX_SPO2) {
    vitals.spo2 = spo2;
  }
  
  // Regular debug output
  if (ENABLE_SERIAL_DEBUG && millis() - lastPrint > 1000) {
    lastPrint = millis();
    Serial.print("HR: ");
    Serial.print(vitals.heartRate, 1);
    Serial.print(" bpm | SpO2: ");
    Serial.print(vitals.spo2, 1);
    Serial.print("% | PI: ");
    Serial.print(vitals.perfusionIndex, 2);
    Serial.print("% | Quality: ");
    Serial.print(vitals.signalQuality * 100, 0);
    Serial.print("% | Samples: ");
    Serial.print(buffer.filled ? BUFFER_SIZE : buffer.index);
    Serial.print(" | Valid: ");
    Serial.println(vitals.dataValid ? "YES" : "NO");
  }
}

// ============================================
// API ENDPOINTS
// ============================================
void handleVitals() {
  sendCORS();
  if (!checkAuth()) return;
  
  String json = "{";
  json += "\"heartRate\":" + String(vitals.heartRate, 1) + ",";
  json += "\"spo2\":" + String(vitals.spo2, 1) + ",";
  json += "\"perfusionIndex\":" + String(vitals.perfusionIndex, 2) + ",";
  json += "\"fingerDetected\":" + String(vitals.fingerDetected ? "true" : "false") + ",";
  json += "\"dataValid\":" + String(vitals.dataValid ? "true" : "false") + ",";
  json += "\"signalQuality\":" + String(vitals.signalQuality, 2) + ",";
  json += "\"confidence\":\"" + String(vitals.consecutiveGoodReadings >= 5 ? "high" : (vitals.consecutiveGoodReadings >= 2 ? "medium" : "low")) + "\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleStatus() {
  sendCORS();
  
  unsigned long uptime = (millis() - startTime) / 1000;
  
  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"uptime\":" + String(uptime) + ",";
  json += "\"wifiSignal\":" + String(WiFi.RSSI()) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"bufferSize\":" + String(buffer.filled ? BUFFER_SIZE : buffer.index) + ",";
  json += "\"algorithm\":\"Optimized Fast v1.0\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleCalibrate() {
  sendCORS();
  if (!checkAuth()) return;
  
  buffer.index = 0;
  buffer.filled = false;
  
  for (int i = 0; i < 5; i++) {
    hrHistory[i] = 0;
    spo2History[i] = 0;
  }
  
  vitals = {0, 0, 0, false, false, 0, 0};
  
  String json = "{\"status\":\"calibrated\",\"message\":\"Place finger on sensor\"}";
  server.send(200, "application/json", json);
  
  if (ENABLE_SERIAL_DEBUG) {
    Serial.println("\n=== CALIBRATED - Ready for reading ===\n");
  }
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP32 Fast Oximeter</title>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
  html += ".card{background:white;padding:20px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-bottom:20px;}";
  html += "h1{color:#333;margin:0 0 5px 0;}";
  html += ".status{color:#28a745;font-weight:bold;}";
  html += ".metric{display:inline-block;margin:15px 20px 10px 0;}";
  html += ".value{font-size:36px;font-weight:bold;color:#007bff;}";
  html += ".label{font-size:13px;color:#666;text-transform:uppercase;}</style>";
  html += "<script>setInterval(()=>fetch('/api/vitals').then(r=>r.json()).then(d=>{";
  html += "document.getElementById('hr').textContent=d.heartRate.toFixed(1);";
  html += "document.getElementById('spo2').textContent=d.spo2.toFixed(1);";
  html += "document.getElementById('pi').textContent=d.perfusionIndex.toFixed(2);";
  html += "document.getElementById('quality').textContent=(d.signalQuality*100).toFixed(0);";
  html += "document.getElementById('finger').textContent=d.fingerDetected?'✓ Detected':'○ Not Detected';";
  html += "}),500);</script></head><body>";
  html += "<div class='card'><h1>⚡ Fast Pulse Oximeter</h1>";
  html += "<p class='status'>● Optimized for Speed</p></div>";
  html += "<div class='card'>";
  html += "<div class='metric'><div class='value' id='hr'>" + String(vitals.heartRate, 1) + "</div>";
  html += "<div class='label'>Heart Rate (bpm)</div></div>";
  html += "<div class='metric'><div class='value' id='spo2'>" + String(vitals.spo2, 1) + "</div>";
  html += "<div class='label'>SpO2 (%)</div></div>";
  html += "<div class='metric'><div class='value' id='pi'>" + String(vitals.perfusionIndex, 2) + "</div>";
  html += "<div class='label'>Perfusion (%)</div></div>";
  html += "<div class='metric'><div class='value' id='quality'>" + String(vitals.signalQuality * 100, 0) + "</div>";
  html += "<div class='label'>Quality (%)</div></div>";
  html += "<p><strong>Finger:</strong> <span id='finger'>" + String(vitals.fingerDetected ? "✓ Detected" : "○ Not Detected") + "</span></p>";
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
}

void handleOptions() {
  sendCORS();
  server.send(204);
}

// ============================================
// SETUP
// ============================================
void setup() {
  if (ENABLE_SERIAL_DEBUG) {
    Serial.begin(SERIAL_BAUD_RATE);
    Serial.println("\n╔═══════════════════════════════════╗");
    Serial.println("║  OPTIMIZED FAST PULSE OXIMETER    ║");
    Serial.println("║  2-3 Second Response Time          ║");
    Serial.println("╚═══════════════════════════════════╝\n");
  }
  
  startTime = millis();
  
  if (LED_WIFI_PIN >= 0) {
    pinMode(LED_WIFI_PIN, OUTPUT);
    digitalWrite(LED_WIFI_PIN, LOW);
  }
  
  Wire.begin();
  
  if (ENABLE_SERIAL_DEBUG) Serial.println("[1/3] Initializing MAX30102...");
  
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    if (ENABLE_SERIAL_DEBUG) {
      Serial.println("✗ ERROR: MAX30102 not found!");
      Serial.println("  Check wiring: SDA→21, SCL→22, VIN→3.3V");
    }
    while (1) delay(1000);
  }
  
  // OPTIMIZED SENSOR CONFIGURATION FOR MAX30102
  // BALANCED for sensitive skin - sweet spot between too strong and too weak
  byte ledBrightness = 0x28;    // 25% brightness - balanced
  byte sampleAverage = 4;       // Average 4 samples - reduces noise
  byte ledMode = 2;             // Red + IR mode
  int sampleRate = 100;         // 100 Hz sampling (10ms per sample)
  int pulseWidth = 411;         // 411μs pulse width (18-bit resolution)
  int adcRange = 4096;          // 4096 nA full scale
  
  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  
  // Set LED currents - BALANCED
  particleSensor.setPulseAmplitudeRed(0x28);    // Medium-low current
  particleSensor.setPulseAmplitudeIR(0x28);     // Medium-low current
  particleSensor.setPulseAmplitudeGreen(0);     // Green LED off
  
  // Enable FIFO rollover for continuous reading
  particleSensor.enableFIFORollover();
  
  if (ENABLE_SERIAL_DEBUG) {
    Serial.println("✓ Sensor optimized for fast readings");
    Serial.println("  LED Brightness: 25% (balanced for your skin)");
    Serial.println("  LED Current: Medium-low (0x28)");
    Serial.println("  Sample Rate: 100 Hz");
    Serial.println("  Resolution: 18-bit");
  }
  
  if (ENABLE_SERIAL_DEBUG) Serial.println("[2/3] Connecting to WiFi...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    if (ENABLE_SERIAL_DEBUG) Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    if (LED_WIFI_PIN >= 0) digitalWrite(LED_WIFI_PIN, HIGH);
    
    if (ENABLE_SERIAL_DEBUG) {
      Serial.println("\n✓ WiFi Connected!");
      Serial.print("  IP: ");
      Serial.println(WiFi.localIP());
    }
  } else {
    if (ENABLE_SERIAL_DEBUG) Serial.println("\n✗ WiFi failed!");
  }
  
  if (ENABLE_SERIAL_DEBUG) Serial.println("[3/3] Starting web server...");
  
  server.on("/", handleRoot);
  server.on("/api/vitals", HTTP_GET, handleVitals);
  server.on("/api/vitals", HTTP_OPTIONS, handleOptions);
  server.on("/status", handleStatus);
  server.on("/calibrate", handleCalibrate);
  
  server.begin();
  
  if (ENABLE_SERIAL_DEBUG) {
    Serial.println("\n╔═══════════════════════════════════╗");
    Serial.println("║         SYSTEM READY              ║");
    Serial.println("╚═══════════════════════════════════╝");
    Serial.println("\n📡 API: http://" + WiFi.localIP().toString() + "/api/vitals");
    Serial.println("🌐 Web: http://" + WiFi.localIP().toString() + "/");
    Serial.println("\n⚡ Place finger on sensor for FAST reading...\n");
    Serial.println("Optimizations:");
    Serial.println("  ✓ Reduced buffer (100 samples)");
    Serial.println("  ✓ Fast peak detection");
    Serial.println("  ✓ Quick SpO2 calculation");
    Serial.println("  ✓ 2-3 second response time\n");
  }
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  server.handleClient();
  
  // Read sensor at configured interval (10ms for 100Hz)
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = millis();
    readSensor();
  }
  
  delay(1);
}
