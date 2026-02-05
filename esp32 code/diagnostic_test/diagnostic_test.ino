/*
 * MAX30102 Diagnostic Test
 * Use this to troubleshoot sensor issues
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== MAX30102 DIAGNOSTIC TEST ===\n");
  
  Wire.begin();
  
  // Test 1: Sensor Detection
  Serial.println("Test 1: Checking if MAX30102 is detected...");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("❌ FAILED: MAX30102 not found!");
    Serial.println("\nTroubleshooting:");
    Serial.println("1. Check wiring:");
    Serial.println("   VIN  → 3.3V (NOT 5V!)");
    Serial.println("   GND  → GND");
    Serial.println("   SDA  → GPIO 21");
    Serial.println("   SCL  → GPIO 22");
    Serial.println("2. Try different I2C pins");
    Serial.println("3. Check if sensor LED lights up");
    while (1) delay(1000);
  }
  Serial.println("✓ PASSED: MAX30102 detected!\n");
  
  // Test 2: Sensor Configuration
  Serial.println("Test 2: Configuring sensor...");
  byte ledBrightness = 0x28;  // 25% brightness (middle ground)
  byte sampleAverage = 4;
  byte ledMode = 2;
  int sampleRate = 100;
  int pulseWidth = 411;
  int adcRange = 4096;
  
  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0x28);  // Medium-low current
  particleSensor.setPulseAmplitudeIR(0x28);
  Serial.println("✓ PASSED: Sensor configured (BALANCED brightness)\n");
  
  // Test 3: LED Test
  Serial.println("Test 3: Testing LEDs...");
  Serial.println("Look at the sensor - you should see RED light!");
  delay(2000);
  Serial.println("✓ If you see red light, LEDs are working\n");
  
  Serial.println("=== LIVE SENSOR READINGS ===");
  Serial.println("Place your finger FIRMLY on the sensor\n");
  Serial.println("IR Value | Red Value | Status");
  Serial.println("---------|-----------|--------");
}

void loop() {
  uint32_t irValue = particleSensor.getIR();
  uint32_t redValue = particleSensor.getRed();
  
  Serial.print(irValue);
  Serial.print("     | ");
  Serial.print(redValue);
  Serial.print("     | ");
  
  if (irValue < 50000) {
    Serial.println("No finger detected");
  } else if (irValue < 100000) {
    Serial.println("Weak signal - press harder");
  } else if (irValue > 200000) {
    Serial.println("Too strong - press lighter");
  } else {
    Serial.println("✓ GOOD SIGNAL!");
  }
  
  delay(500);
}
