# ESP32 Vital Signs Gateway

Real-time SpO2 and Heart Rate monitoring system using ESP32 and MAX30105 sensor with RESTful API for web integration.

## Features

- ✅ Real-time SpO2 (Blood Oxygen) and Heart Rate monitoring
- ✅ RESTful API with CORS support
- ✅ Data validation and filtering
- ✅ Non-blocking architecture
- ✅ Web-based status dashboard
- ✅ Optional API key authentication
- ✅ Automatic sensor calibration
- ✅ Error handling and recovery

## Hardware Requirements

- ESP32 Development Board
- MAX30105 Pulse Oximeter Sensor
- Jumper wires
- USB cable for programming

## Wiring Diagram

```
MAX30105 Sensor -> ESP32
--------------------------
VIN  -> 3.3V
GND  -> GND
SDA  -> GPIO 21 (I2C Data)
SCL  -> GPIO 22 (I2C Clock)
```

## Software Requirements

### Arduino IDE Setup

1. Install Arduino IDE (1.8.19 or later)
2. Add ESP32 board support:
   - Go to File > Preferences
   - Add to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to Tools > Board > Boards Manager
   - Search "ESP32" and install "esp32 by Espressif Systems"

3. Install required libraries:
   - Go to Sketch > Include Library > Manage Libraries
   - Install:
     - **SparkFun MAX3010x Pulse and Proximity Sensor Library** by SparkFun Electronics
     - **WiFi** (built-in with ESP32)
     - **WebServer** (built-in with ESP32)

## Configuration

1. Open `config.h` file
2. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   ```

3. (Optional) Configure API authentication:
   ```cpp
   const char* API_KEY = "your-secret-key";
   const bool ENABLE_API_AUTH = true;
   ```

4. (Optional) Adjust sensor thresholds and timing

## Installation

1. Connect ESP32 to computer via USB
2. Open `esp32_SpO2_and_Heartrate.ino` in Arduino IDE
3. Select board: Tools > Board > ESP32 Dev Module
4. Select port: Tools > Port > (your ESP32 port)
5. Click Upload button
6. Open Serial Monitor (115200 baud) to see status

## API Endpoints

### GET /api/vitals
Get current vital signs readings.

**Response:**
```json
{
  "heartRate": 75,
  "spo2": 98.5,
  "fingerDetected": true,
  "dataValid": true
}
```

### GET /status
Get gateway system status.

**Response:**
```json
{
  "status": "online",
  "uptime": 3600,
  "totalRequests": 1234,
  "wifiSignal": -45,
  "freeHeap": 280000,
  "sensorConnected": true
}
```

### GET /calibrate
Reset and recalibrate the sensor.

**Response:**
```json
{
  "status": "calibrating",
  "message": "Sensor reset. Please wait 3 seconds."
}
```

### GET /
Web-based status dashboard (HTML).

## Frontend Integration

### Update .env.local

```env
NEXT_PUBLIC_ESP32_API_URL=http://192.168.1.XXX/api/vitals
```

Replace `192.168.1.XXX` with your ESP32's IP address (shown in Serial Monitor).

### CORS Support

The gateway automatically handles CORS headers, allowing requests from any origin. For production, consider restricting origins in the code.

## Usage

1. Upload code to ESP32
2. Open Serial Monitor to get IP address
3. Place finger on MAX30105 sensor
4. Wait 3 seconds for calibration
5. Readings will appear in Serial Monitor and API

## Troubleshooting

### Sensor Not Found
- Check wiring connections
- Verify I2C pins (SDA=21, SCL=22)
- Ensure sensor has power (3.3V)
- Try different I2C address if needed

### WiFi Connection Failed
- Verify SSID and password in config.h
- Check WiFi signal strength
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)

### Inaccurate Readings
- Ensure finger is properly placed on sensor
- Keep finger still during measurement
- Clean sensor surface
- Adjust IR_THRESHOLD in config.h
- Wait for full calibration (3 seconds)

### No Data in Frontend
- Verify ESP32 IP address in .env.local
- Check CORS headers in browser console
- Ensure ESP32 and frontend are on same network
- Test API directly: `http://ESP32_IP/api/vitals`

## Data Validation

The system validates readings to ensure accuracy:
- Heart Rate: 40-200 bpm
- SpO2: 70-100%
- Automatic rejection of invalid data
- Moving average for stability

## Performance

- Sensor read interval: 20ms
- API response time: <10ms
- Data update rate: ~50Hz
- Web server: Non-blocking

## Security Notes

⚠️ **Important for Production:**
- Change default API key in config.h
- Enable API authentication (ENABLE_API_AUTH = true)
- Restrict CORS origins to your domain
- Use HTTPS if possible (requires additional setup)
- Don't expose device directly to internet

## Advanced Configuration

### Sensor Tuning

Adjust in `setup()` function:
```cpp
byte ledBrightness = 0x2F;  // LED intensity
byte sampleAverage = 4;      // Averaging samples
int sampleRate = 400;        // Samples per second
int pulseWidth = 411;        // LED pulse width
```

### Calibration Time

Adjust in config.h:
```cpp
const unsigned long CALIBRATION_TIME = 3000; // milliseconds
```

## License

This code is provided as-is for the Blood Group Detection System project.

## Support

For issues or questions:
1. Check Serial Monitor output for errors
2. Verify hardware connections
3. Test API endpoints directly in browser
4. Check frontend console for CORS errors

## Version History

- **v2.0** - Complete rewrite with improved algorithms, validation, and API
- **v1.0** - Initial version with basic functionality
