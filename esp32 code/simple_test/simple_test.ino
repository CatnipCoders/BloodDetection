/*
 * SIMPLE MAX30102 Test - Minimal Code
 * This will show if basic heart rate detection works
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 sensor;

const int BUFFER_SIZE = 150;  // Increased from 100 for more peaks
uint32_t irBuffer[BUFFER_SIZE];
int bufferIndex = 0;
bool bufferFilled = false;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== SIMPLE MAX30102 TEST ===\n");
  
  Wire.begin();
  
  if (!sensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERROR: Sensor not found!");
    while(1);
  }
  
  // Simple configuration - 25% brightness
  sensor.setup(0x28, 4, 2, 100, 411, 4096);
  sensor.setPulseAmplitudeRed(0x28);
  sensor.setPulseAmplitudeIR(0x28);
  
  Serial.println("Sensor ready!");
  Serial.println("Place finger on sensor...\n");
}

void loop() {
  uint32_t ir = sensor.getIR();
  
  // Check finger
  if (ir < 60000) {
    Serial.println("No finger detected");
    bufferIndex = 0;
    bufferFilled = false;
    delay(1000);
    return;
  }
  
  // Store value
  irBuffer[bufferIndex++] = ir;
  if (bufferIndex >= BUFFER_SIZE) {
    bufferIndex = 0;
    bufferFilled = true;
  }
  
  // Need at least 75 samples (more for better accuracy)
  if (!bufferFilled && bufferIndex < 75) {
    if (bufferIndex % 10 == 0) {
      Serial.print("Collecting: ");
      Serial.print(bufferIndex);
      Serial.println("/75");
    }
    delay(10);
    return;
  }
  
  // Find peaks every 2 seconds (more data = better accuracy)
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < 2000) {
    delay(10);
    return;
  }
  lastCheck = millis();
  
  // Calculate min, max, mean
  uint32_t minVal = 999999, maxVal = 0;
  float sum = 0;
  int size = bufferFilled ? BUFFER_SIZE : bufferIndex;
  
  for (int i = 0; i < size; i++) {
    if (irBuffer[i] < minVal) minVal = irBuffer[i];
    if (irBuffer[i] > maxVal) maxVal = irBuffer[i];
    sum += irBuffer[i];
  }
  
  float mean = sum / size;
  float amplitude = maxVal - minVal;
  float threshold = mean + amplitude * 0.3;  // REDUCED from 0.5 - more sensitive
  
  // Count peaks - using mean as threshold for flat signals
  int peakCount = 0;
  int lastPeak = -45;  // Reduced from -50 to -45 (0.45 seconds minimum)
  
  // For flat signals, use mean + small offset
  float peakThreshold = (amplitude < 20000) ? mean + (amplitude * 0.2) : threshold;
  
  for (int i = 3; i < size - 3; i++) {  // Increased from 2 to 3 for better validation
    if (irBuffer[i] > peakThreshold &&
        irBuffer[i] > irBuffer[i-1] && irBuffer[i] > irBuffer[i-2] &&
        irBuffer[i] > irBuffer[i+1] && irBuffer[i] > irBuffer[i+2] &&
        irBuffer[i] >= irBuffer[i-3] && irBuffer[i] >= irBuffer[i+3] &&  // Additional validation
        (i - lastPeak) >= 45) {  // Reduced from 50 to 45 (0.45 seconds minimum)
      peakCount++;
      lastPeak = i;
    }
  }
  
  // Calculate heart rate
  Serial.println("\n=== ANALYSIS ===");
  Serial.print("Min: "); Serial.print(minVal);
  Serial.print(" | Max: "); Serial.print(maxVal);
  Serial.print(" | Amp: "); Serial.println(amplitude, 2);
  Serial.print("Mean: "); Serial.print(mean, 0);
  Serial.print(" | Threshold: "); Serial.println(threshold, 0);
  
  // Show adjusted threshold for flat signals
  if (amplitude < 20000) {
    float adjustedThreshold = mean + (amplitude * 0.2);
    Serial.print("ADJUSTED Threshold (flat signal): ");
    Serial.println(adjustedThreshold, 0);
  }
  
  Serial.print("Peaks found: "); Serial.println(peakCount);
  
  if (peakCount >= 2) {
    // Calculate intervals between peaks
    float intervals[20];
    int intervalCount = 0;
    
    // Find peak positions first
    int peakPositions[20];
    int foundPeaks = 0;
    lastPeak = -45;  // Reduced from -50 to -45 (0.45 seconds minimum)
    
    for (int i = 3; i < size - 3; i++) {
      if (irBuffer[i] > peakThreshold &&
          irBuffer[i] > irBuffer[i-1] && irBuffer[i] > irBuffer[i-2] &&
          irBuffer[i] > irBuffer[i+1] && irBuffer[i] > irBuffer[i+2] &&
          irBuffer[i] >= irBuffer[i-3] && irBuffer[i] >= irBuffer[i+3] &&
          (i - lastPeak) >= 45) {  // 0.45 seconds minimum between peaks
        peakPositions[foundPeaks] = i;
        
        // Debug: show peak details
        if (foundPeaks < 10) {
          Serial.print("  Peak ");
          Serial.print(foundPeaks + 1);
          Serial.print(" at sample ");
          Serial.print(i);
          Serial.print(" (");
          Serial.print(i * 0.01, 2);
          Serial.print("s), value: ");
          Serial.println(irBuffer[i]);
        }
        
        foundPeaks++;
        lastPeak = i;
        if (foundPeaks >= 20) break;
      }
    }
    
    Serial.print("\nTotal peaks found: ");
    Serial.println(foundPeaks);
    
    // Calculate intervals
    Serial.println("\n--- Interval Analysis ---");
    for (int i = 1; i < foundPeaks; i++) {
      int interval = peakPositions[i] - peakPositions[i-1];
      float bpm = (60.0 * 100.0) / interval; // 100 Hz sample rate
      
      Serial.print("Interval ");
      Serial.print(i);
      Serial.print(": ");
      Serial.print(interval);
      Serial.print(" samples (");
      Serial.print(interval * 0.01, 2);
      Serial.print("s) = ");
      Serial.print(bpm, 1);
      Serial.print(" BPM");
      
      // Accept wider range: 40-200 BPM (was 40-180)
      if (bpm >= 40 && bpm <= 200) {
        intervals[intervalCount++] = interval;
        Serial.println(" ✓ ACCEPTED");
      } else {
        Serial.print(" ✗ REJECTED (out of 40-200 BPM range)");
        Serial.println();
      }
    }
    
    Serial.print("Valid intervals: ");
    Serial.print(intervalCount);
    Serial.print(" out of ");
    Serial.println(foundPeaks - 1);
    
    if (intervalCount >= 2) {
      Serial.println("\n✓ Enough valid intervals for calculation");
      
      // Calculate median interval (more robust than mean)
      float sortedIntervals[20];
      for (int i = 0; i < intervalCount; i++) {
        sortedIntervals[i] = intervals[i];
      }
      
      // Simple bubble sort
      for (int i = 0; i < intervalCount - 1; i++) {
        for (int j = 0; j < intervalCount - i - 1; j++) {
          if (sortedIntervals[j] > sortedIntervals[j+1]) {
            float temp = sortedIntervals[j];
            sortedIntervals[j] = sortedIntervals[j+1];
            sortedIntervals[j+1] = temp;
          }
        }
      }
      
      // Get median
      float medianInterval;
      if (intervalCount % 2 == 0) {
        medianInterval = (sortedIntervals[intervalCount/2 - 1] + sortedIntervals[intervalCount/2]) / 2.0;
      } else {
        medianInterval = sortedIntervals[intervalCount/2];
      }
      
      Serial.print("Median interval: ");
      Serial.print(medianInterval, 1);
      Serial.print(" samples (");
      Serial.print(medianInterval * 0.01, 2);
      Serial.println("s)");
      
      float bpm = (60.0 * 100.0) / medianInterval;
      
      Serial.print("Calculated BPM: ");
      Serial.println(bpm, 1);
      
      // Apply smoothing with history
      static float bpmHistory[5] = {0};
      static int historyIndex = 0;
      
      bpmHistory[historyIndex] = bpm;
      historyIndex = (historyIndex + 1) % 5;
      
      // Calculate average of history
      float sum = 0;
      int count = 0;
      for (int i = 0; i < 5; i++) {
        if (bpmHistory[i] > 0) {
          sum += bpmHistory[i];
          count++;
        }
      }
      
      float avgBpm = sum / count;
      
      Serial.print("Smoothed BPM (avg of ");
      Serial.print(count);
      Serial.print(" readings): ");
      Serial.println(avgBpm, 1);
      
      // Final validation - WIDENED RANGE to 40-200 BPM
      if (avgBpm >= 40 && avgBpm <= 200) {
        Serial.println("\n╔════════════════════════════╗");
        Serial.print("║ >>> HEART RATE: ");
        Serial.print(avgBpm, 1);
        Serial.println(" bpm <<< ║");
        Serial.println("╚════════════════════════════╝");
        
        // Show confidence
        if (intervalCount >= 4 && count >= 3) {
          Serial.println("Confidence: HIGH");
        } else if (intervalCount >= 2) {
          Serial.println("Confidence: MEDIUM (hold longer for better accuracy)");
        } else {
          Serial.println("Confidence: LOW (hold still longer)");
        }
      } else {
        Serial.print("⚠ BPM out of range (40-200): ");
        Serial.println(avgBpm, 1);
      }
    } else {
      Serial.println("\n⚠ Not enough valid intervals");
      Serial.print("   Need at least 2, got: ");
      Serial.println(intervalCount);
      Serial.println("   Possible reasons:");
      Serial.println("   - Peaks too close together (< 0.5s)");
      Serial.println("   - Peaks too far apart (> 1.5s)");
      Serial.println("   - Hold finger still longer");
    }
  } else {
    Serial.println("Not enough peaks - hold still longer!");
  }
  Serial.println("================\n");
  
  delay(10);
}
