// Configuration file for ESP32 Vital Signs Gateway
// Copy this file and customize for your setup

#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
const char* WIFI_SSID = "Mangi";
const char* WIFI_PASSWORD = "Mangi123@";

// API Configuration
const char* API_KEY = "your-secret-key-here"; // Change this for security
const bool ENABLE_API_AUTH = false; // Set to true to require API key

// Sensor Configuration
const int IR_THRESHOLD = 50000; // Minimum IR value to detect finger
const int SAMPLE_RATE = 100; // Samples per second

// Data Validation Ranges
const int MIN_HEART_RATE = 40;
const int MAX_HEART_RATE = 200;
const float MIN_SPO2 = 70.0;
const float MAX_SPO2 = 100.0;

// Timing Configuration
const unsigned long SENSOR_READ_INTERVAL = 10; // ms between sensor reads (100Hz = 10ms)
const unsigned long CALIBRATION_TIME = 3000; // ms to wait for sensor stabilization

// Debug Configuration
const bool ENABLE_SERIAL_DEBUG = true;
const int SERIAL_BAUD_RATE = 115200;

// LED Indicators (optional - set to -1 to disable)
const int LED_WIFI_PIN = 2; // Built-in LED for WiFi status
const int LED_FINGER_PIN = -1; // LED for finger detection
const int LED_ERROR_PIN = -1; // LED for error indication

#endif