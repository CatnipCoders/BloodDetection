/*
 * ESP32 + MAX30102 Advanced Implementation
 * 
 * This code implements proper algorithms for:
 * - Heart Rate Detection using Peak Detection
 * - SpO2 Calculation using R-value (Red/IR ratio)
 * - Signal Quality Assessment
 * - Adaptive Filtering
 * 
 * Hardware:
 * - ESP32 Development Board
 * - MAX30102 Pulse Oximeter Sensor
 * 
 * Wiring:
 * MAX30102 -> ESP32
 * VIN  -> 3.3V
 * GND  -> GND
 * SDA  -> GPIO 21
 * SCL  -> GPIO 22
 * 
 * Libraries Required:
 * - SparkFun MAX3010x Pulse and Proximity Sensor Library
 * 
 * Author: Blood Group Detection System
 * Version: 3.0 - Advanced Algorithm Implementation
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include "MAX30105.h"
#include "config.h"

// ============================================
// SENSOR CONFIGURATION
// ============================================
MAX30105 particleSensor;  // MAX30102 uses MAX30105 library
WebServer server(80);

// ============================================
// ALGORITHM CONSTANTS
// ============================================
// Heart Rate Detection
const int BUFFER_SIZE = 100;              // Sample buffer size
const float SAMPLE_PERIOD = 1000.0 / SAMPLE_RATE; // ms per sample
const int MIN_PEAK_DISTANCE = 30;         // Minimum samples between peaks (~300ms at 100Hz)
const float PEAK_THRESHOLD_RATIO = 0.7;   // Peak must be 70% of max value

// SpO2 Calculation
const int SPO2_BUFFER_SIZE = 25;          // Number of samples for SpO2 averaging
const float AC_THRESHOLD = 100.0;         // Minimum AC component for valid signal

// Signal Quality
const int QUALITY_WINDOW = 50;            // Samples for quality assessment
const float MIN_SIGNAL_QUALITY = 0.5;     // Minimum acceptable signal quality (0-1)

// ============================================
// DATA STRUCTURES
// ============================================
struct SensorData {
  uint32_t red;
  uint32_t ir;
  unsigned long timestamp;
};

struct VitalSigns {
  float heartRate;
  float spo2;
  bool fingerDetected;
  bool dataValid;
  float signalQuality;
  unsigned long lastUpdate;
};

struct SignalComponents {
  float dcRed;
  float dcIR;
  float acRed;
  float acIR;
};

// ============================================
// GLOBAL VARIABLES
// ============================================
VitalSigns currentVitals = {0, 0, false, false, 0, 0};
SensorData sensorBuffer[BUFFER_SIZE];
int bufferIndex = 0;
bool bufferFilled = false;

// Heart Rate Detection
float irValues[BUFFER_SIZE];
int peakIndices[20];
int peakCount = 0;
unsigned long lastHeartBeat = 0;
float heartRateHistory[10];
int hrHistoryIndex = 0;

// SpO2 Calculation
float ratioHistory[SPO2_BUFFER_SIZE];
int ratioIndex = 0;
bool ratioBufferFilled = false;

// Statistics
unsigned long totalRequests = 0;
unsigned long startTime = 0;
unsigned long lastSensorRead = 0;

// ============================================
// CORS HANDLER
// ============================================
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Max-Age", "600");
  server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "X-API-Key,Content-Type");
}

// ============================================
// AUTHENTICATION
// ============================================
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
// SIGNAL PROCESSING FUNCTIONS
// ============================================

// Calculate DC component (average)
float calculateDC(uint32_t* values, int size) {
  float sum = 0;
  for (int i = 0; i < size; i++) {
    sum += values[i];
  }
  return sum / size;
}

// Calculate AC component (standard deviation)
float calculateAC(uint32_t* values, float dc, int size) {
  float sum = 0;
  for (int i = 0; i < size; i++) {
    float diff = values[i] - dc;
    sum += diff * diff;
  }
  return sqrt(sum / size);
}

// Extract DC and AC components from signal
SignalComponents extractSignalComponents() {
  SignalComponents components;
  
  uint32_t redValues[BUFFER_SIZE];
  uint32_t irValues[BUFFER_SIZE];
  
  // Extract values from circular buffer
  for (int i = 0; i < BUFFER_SIZE; i++) {
    int idx = (bufferIndex + i) % BUFFER_SIZE;
    redValues[i] = sensorBuffer[idx].red;
    irValues[i] = sensorBuffer[idx].ir;
  }
  
  // Calculate DC components
  components.dcRed = calculateDC(redValues, BUFFER_SIZE);
  components.dcIR = calculateDC(irValues, BUFFER_SIZE);
  
  // Calculate AC components
  components.acRed = calculateAC(redValues, components.dcRed, BUFFER_SIZE);
  components.acIR = calculateAC(irValues, components.dcIR, BUFFER_SIZE);
  
  return components;
}

// Calculate signal quality (0-1 scale)
float calculateSignalQuality() {
  if (!bufferFilled) return 0;
  
  SignalComponents comp = extractSignalComponents();
  
  // Check if AC components are sufficient
  if (comp.acIR < AC_THRESHOLD) return 0;
  
  // Signal-to-noise ratio approximation
  float snrIR = comp.acIR / (comp.dcIR * 0.01); // Assume 1% noise
  float snrRed = comp.acRed / (comp.dcRed * 0.01);
  
  // Normalize to 0-1 scale
  float quality = min(1.0, (snrIR + snrRed) / 40.0);
  
  return quality;
}

// ============================================
// HEART RATE DETECTION
// ============================================

// Find peaks in IR signal using derivative method
void detectPeaks() {
  if (!bufferFilled) return;
  
  peakCount = 0;
  float maxValue = 0;
  
  // Find maximum value for threshold
  for (int i = 0; i < BUFFER_SIZE; i++) {
    if (irValues[i] > maxValue) maxValue = irValues[i];
  }
  
  float threshold = maxValue * PEAK_THRESHOLD_RATIO;
  
  // Detect peaks using derivative
  for (int i = 2; i < BUFFER_SIZE - 2; i++) {
    // Check if current point is a local maximum
    if (irValues[i] > threshold &&
        irValues[i] > irValues[i-1] &&
        irValues[i] > irValues[i-2] &&
        irValues[i] > irValues[i+1] &&
        irValues[i] > irValues[i+2]) {
      
      // Check minimum distance from last peak
      if (peakCount == 0 || (i - peakIndices[peakCount-1]) >= MIN_PEAK_DISTANCE) {
        peakIndices[peakCount++] = i;
        if (peakCount >= 20) break; // Prevent overflow
      }
    }
  }
}

// Calculate heart rate from detected peaks
float calculateHeartRate() {
  if (peakCount < 2) return 0;
  
  // Calculate average interval between peaks
  float totalInterval = 0;
  int validIntervals = 0;
  
  for (int i = 1; i < peakCount; i++) {
    int interval = peakIndices[i] - peakIndices[i-1];
    
    // Filter out unrealistic intervals
    // 30-200 BPM range = 300-2000ms = 30-200 samples at 100Hz
    if (interval >= 30 && interval <= 200) {
      totalInterval += interval;
      validIntervals++;
    }
  }
  
  if (validIntervals == 0) return 0;
  
  float avgInterval = totalInterval / validIntervals;
  
  // Convert to BPM: (60 seconds * SAMPLE_RATE) / samples_per_beat
  float bpm = (60.0 * SAMPLE_RATE) / avgInterval;
  
  // Add to history for smoothing
  heartRateHistory[hrHistoryIndex] = bpm;
  hrHistoryIndex = (hrHistoryIndex + 1) % 10;
  
  // Calculate moving average
  float sum = 0;
  int count = 0;
  for (int i = 0; i < 10; i++) {
    if (heartRateHistory[i] > 0) {
      sum += heartRateHistory[i];
      count++;
    }
  }
  
  return count > 0 ? sum / count : 0;
}

// ============================================
// SPO2 CALCULATION
// ============================================

// Calculate SpO2 using R-value method
// Based on research: SpO2 = 110 - 25*R (empirical formula)
// R = (AC_red/DC_red) / (AC_ir/DC_ir)
float calculateSpO2() {
  if (!bufferFilled) return 0;
  
  SignalComponents comp = extractSignalComponents();
  
  // Check for valid signal
  if (comp.dcRed < 1000 || comp.dcIR < 1000) return 0;
  if (comp.acRed < AC_THRESHOLD || comp.acIR < AC_THRESHOLD) return 0;
  
  // Calculate normalized ratios
  float redRatio = comp.acRed / comp.dcRed;
  float irRatio = comp.acIR / comp.dcIR;
  
  // Prevent division by zero
  if (irRatio < 0.001) return 0;
  
  // Calculate R-value
  float R = redRatio / irRatio;
  
  // Add to history buffer
  ratioHistory[ratioIndex] = R;
  ratioIndex = (ratioIndex + 1) % SPO2_BUFFER_SIZE;
  if (ratioIndex == 0) ratioBufferFilled = true;
  
  // Calculate average R from history
  float avgR = 0;
  int count = ratioBufferFilled ? SPO2_BUFFER_SIZE : ratioIndex;
  
  for (int i = 0; i < count; i++) {
    avgR += ratioHistory[i];
  }
  avgR /= count;
  
  // Apply empirical formula
  // Different formulas can be used based on calibration:
  // Formula 1: SpO2 = 110 - 25*R (common)
  // Formula 2: SpO2 = 104 - 17*R (alternative)
  // Formula 3: SpO2 = -45.060*R^2 + 30.354*R + 94.845 (polynomial)
  
  float spo2 = 110.0 - 25.0 * avgR;
  
  // Clamp to valid range
  if (spo2 > 100.0) spo2 = 100.0;
  if (spo2 < 70.0) spo2 = 0; // Below 70% is unrealistic
  
  return spo2;
}

// ============================================
// SENSOR READING
// ============================================

void readSensor() {
  // Read raw values
  uint32_t irValue = particleSensor.getIR();
  uint32_t redValue = particleSensor.getRed();
  
  // Check for finger detection
  if (irValue < IR_THRESHOLD) {
    currentVitals.fingerDetected = false;
    currentVitals.dataValid = false;
    currentVitals.heartRate = 0;
    currentVitals.spo2 = 0;
    currentVitals.signalQuality = 0;
    
    // Reset buffers
    bufferFilled = false;
    bufferIndex = 0;
    peakCount = 0;
    ratioBufferFilled = false;
    ratioIndex = 0;
    
    return;
  }
  
  currentVitals.fingerDetected = true;
  
  // Store in circular buffer
  sensorBuffer[bufferIndex].red = redValue;
  sensorBuffer[bufferIndex].ir = irValue;
  sensorBuffer[bufferIndex].timestamp = millis();
  irValues[bufferIndex] = irValue; // For peak detection
  
  bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  if (bufferIndex == 0) bufferFilled = true;
  
  // Need full buffer for processing
  if (!bufferFilled) return;
  
  // Calculate signal quality
  currentVitals.signalQuality = calculateSignalQuality();
  
  // Only process if signal quality is good
  if (currentVitals.signalQuality < MIN_SIGNAL_QUALITY) {
    currentVitals.dataValid = false;
    return;
  }
  
  // Detect peaks and calculate heart rate
  detectPeaks();
  float hr = calculateHeartRate();
  
  // Calculate SpO2
  float spo2 = calculateSpO2();
  
  // Validate results
  if (hr >= MIN_HEART_RATE && hr <= MAX_HEART_RATE && spo2 >= MIN_SPO2 && spo2 <= MAX_SPO2) {
    currentVitals.heartRate = hr;
    currentVitals.spo2 = spo2;
    currentVitals.dataValid = true;
    currentVitals.lastUpdate = millis();
    
    if (ENABLE_SERIAL_DEBUG && millis() % 2000 < 50) {
      Serial.print("HR: ");
      Serial.print(currentVitals.heartRate, 1);
      Serial.print(" bpm | SpO2: ");
      Serial.print(currentVitals.spo2, 1);
      Serial.print("% | Quality: ");
      Serial.print(currentVitals.signalQuality * 100, 0);
      Serial.println("%");
    }
  }
}

// ============================================
// API ENDPOINTS
// ============================================

void handleVitals() {
  sendCORS();
  if (!checkAuth()) return;
  
  totalRequests++;
  
  String json = "{";
  json += "\"heartRate\":" + String(currentVitals.heartRate, 1) + ",";
  json += "\"spo2\":" + String(currentVitals.spo2, 1) + ",";
  json += "\"fingerDetected\":" + String(currentVitals.fingerDetected ? "true" : "false") + ",";
  json += "\"dataValid\":" + String(currentVitals.dataValid ? "true" : "false") + ",";
  json += "\"signalQuality\":" + String(currentVitals.signalQuality, 2);
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleStatus() {
  sendCORS();
  
  unsigned long uptime = (millis() - startTime) / 1000;
  
  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"uptime\":" + String(uptime) + ",";
  json += "\"totalRequests\":" + String(totalRequests) + ",";
  json += "\"wifiSignal\":" + String(WiFi.RSSI()) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"bufferFilled\":" + String(bufferFilled ? "true" : "false") + ",";
  json += "\"peakCount\":" + String(peakCount);
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleCalibrate() {
  sendCORS();
  if (!checkAuth()) return;
  
  // Reset all buffers and state
  bufferFilled = false;
  bufferIndex = 0;
  peakCount = 0;
  ratioBufferFilled = false;
  ratioIndex = 0;
  hrHistoryIndex = 0;
  
  for (int i = 0; i < 10; i++) heartRateHistory[i] = 0;
  for (int i = 0; i < SPO2_BUFFER_SIZE; i++) ratioHistory[i] = 0;
  
  currentVitals = {0, 0, false, false, 0, 0};
  
  String json = "{\"status\":\"calibrating\",\"message\":\"Buffers reset. Place finger on sensor.\"}";
  server.send(200, "application/json", json);
  
  if (ENABLE_SERIAL_DEBUG) {
    Serial.println("Calibration requested - all buffers reset");
  }
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP32 MAX30102 Gateway</title>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f5f5f5;}";
  html += ".card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);margin-bottom:20px;}";
  html += "h1{color:#333;margin:0 0 10px 0;}h2{color:#666;font-size:18px;margin:15px 0 10px 0;}";
  html += ".status{color:#28a745;font-weight:bold;font-size:14px;}";
  html += ".metric{display:inline-block;margin:10px 20px 10px 0;}";
  html += ".value{font-size:32px;font-weight:bold;color:#007bff;}";
  html += ".label{font-size:12px;color:#666;text-transform:uppercase;}</style>";
  html += "<script>setInterval(()=>fetch('/api/vitals').then(r=>r.json()).then(d=>{";
  html += "document.getElementById('hr').textContent=d.heartRate.toFixed(1);";
  html += "document.getElementById('spo2').textContent=d.spo2.toFixed(1);";
  html += "document.getElementById('quality').textContent=(d.signalQuality*100).toFixed(0);";
  html += "document.getElementById('finger').textContent=d.fingerDetected?'✓ Detected':'○ Not Detected';";
  html += "}),1000);</script></head><body>";
  html += "<div class='card'><h1>🏥 ESP32 MAX30102 Gateway</h1>";
  html += "<p class='status'>● System Online</p></div>";
  html += "<div class='card'><h2>Real-Time Readings</h2>";
  html += "<div class='metric'><div class='value' id='hr'>" + String(currentVitals.heartRate, 1) + "</div>";
  html += "<div class='label'>Heart Rate (bpm)</div></div>";
  html += "<div class='metric'><div class='value' id='spo2'>" + String(currentVitals.spo2, 1) + "</div>";
  html += "<div class='label'>SpO2 (%)</div></div>";
  html += "<div class='metric'><div class='value' id='quality'>" + String(currentVitals.signalQuality * 100, 0) + "</div>";
  html += "<div class='label'>Signal Quality (%)</div></div>";
  html += "<p><strong>Finger:</strong> <span id='finger'>" + String(currentVitals.fingerDetected ? "✓ Detected" : "○ Not Detected") + "</span></p>";
  html += "</div>";
  html += "<div class='card'><h2>API Endpoints</h2>";
  html += "<ul><li><code>GET /api/vitals</code> - Current vital signs</li>";
  html += "<li><code>GET /status</code> - Gateway status</li>";
  html += "<li><code>GET /calibrate</code> - Reset sensor</li></ul></div>";
  html += "</body></html>";
  
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
    Serial.println("\n\n=== ESP32 MAX30102 Advanced Gateway ===");
    Serial.println("Algorithm: Peak Detection + R-value SpO2");
  }
  
  startTime = millis();
  
  // Initialize LED
  if (LED_WIFI_PIN >= 0) {
    pinMode(LED_WIFI_PIN, OUTPUT);
    digitalWrite(LED_WIFI_PIN, LOW);
  }
  
  // Initialize I2C
  Wire.begin();
  
  // Initialize MAX30102
  if (ENABLE_SERIAL_DEBUG) Serial.println("Initializing MAX30102...");
  
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    if (ENABLE_SERIAL_DEBUG) {
      Serial.println("ERROR: MAX30102 not found!");
      Serial.println("Check wiring: SDA->21, SCL->22, VIN->3.3V, GND->GND");
    }
    while (1) delay(1000);
  }
  
  // Configure sensor for optimal performance
  byte ledBrightness = 0x3F;  // 0x00-0xFF (higher = brighter, more power)
  byte sampleAverage = 4;     // 1, 2, 4, 8, 16, 32
  byte ledMode = 2;           // 1=Red only, 2=Red+IR, 3=Red+IR+Green
  int sampleRate = 100;       // 50, 100, 200, 400, 800, 1000, 1600, 3200
  int pulseWidth = 411;       // 69, 118, 215, 411 (μs)
  int adcRange = 4096;        // 2048, 4096, 8192, 16384
  
  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
  
  if (ENABLE_SERIAL_DEBUG) Serial.println("Sensor configured successfully");
  
  // Connect to WiFi
  if (ENABLE_SERIAL_DEBUG) {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
  }
  
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
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      Serial.print("Signal: ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
    }
  } else {
    if (ENABLE_SERIAL_DEBUG) {
      Serial.println("\n✗ WiFi Failed!");
    }
    while (1) delay(1000);
  }
  
  // Setup endpoints
  server.on("/", handleRoot);
  server.on("/api/vitals", HTTP_GET, handleVitals);
  server.on("/api/vitals", HTTP_OPTIONS, handleOptions);
  server.on("/status", handleStatus);
  server.on("/calibrate", handleCalibrate);
  
  server.begin();
  
  if (ENABLE_SERIAL_DEBUG) {
    Serial.println("\n=== Gateway Ready ===");
    Serial.println("API: http://" + WiFi.localIP().toString() + "/api/vitals");
    Serial.println("Web: http://" + WiFi.localIP().toString() + "/");
    Serial.println("\nPlace finger on sensor...\n");
  }
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  server.handleClient();
  
  // Read sensor at specified interval
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = millis();
    readSensor();
  }
  
  delay(1);
}
