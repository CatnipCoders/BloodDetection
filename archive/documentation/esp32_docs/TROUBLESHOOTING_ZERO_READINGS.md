# Troubleshooting: Getting 0.00 for Heart Rate and SpO2

## Quick Diagnosis Steps

### Step 1: Run Diagnostic Test

Upload and run `diagnostic_test.ino` first:

1. Open `esp32 code/hospital_grade_esp32_max30102/diagnostic_test.ino`
2. Upload to ESP32
3. Open Serial Monitor (115200 baud)
4. Place finger on sensor
5. Check the output

**What to look for:**
```
IR Value | Red Value | Status
---------|-----------|--------
150000   | 120000    | ✓ GOOD SIGNAL!
```

If you see:
- **IR < 50000**: No finger detected or sensor issue
- **IR 50000-100000**: Weak signal, press harder
- **IR 100000-200000**: Good signal range ✓
- **IR > 200000**: Too strong, press lighter

### Step 2: Check Serial Monitor Output

Look for these messages in the main code:

#### ❌ Problem: "No finger detected"
```
👆 No finger detected (IR: 25000 < threshold: 50000)
   Place finger FIRMLY on sensor
```

**Solutions:**
1. **Press harder** - Apply firm pressure
2. **Warm your finger** - Rub hands together first
3. **Clean sensor** - Wipe with soft cloth
4. **Try different finger** - Index finger usually works best
5. **Lower threshold** - Edit config.h:
   ```cpp
   const int IR_THRESHOLD = 30000;  // Lower from 50000
   ```

#### ❌ Problem: "Not enough peaks detected"
```
⚠ Not enough peaks detected: 0 (need at least 2)
```

**Solutions:**
1. **Hold still** - Don't move finger for 5 seconds
2. **Better contact** - Ensure finger covers entire sensor
3. **Check signal amplitude**:
   ```
   Signal - Min: 80000, Max: 85000, Amp: 5000
   ```
   - If Amplitude < 1000: Signal too weak
   - Increase LED brightness in code

#### ❌ Problem: "No valid intervals"
```
⚠ No valid intervals (all outside 40-200 BPM range)
```

**Solutions:**
1. **Relax** - Calm breathing, don't hold breath
2. **Wait longer** - Give it 10 seconds
3. **Check for movement** - Keep finger completely still

#### ❌ Problem: "Reading rejected"
```
⚠ Reading rejected - Quality: 25%, HR: 0.0
```

**Solutions:**
1. **Improve signal quality**:
   - Press firmer
   - Better finger placement
   - Warm finger
2. **Lower quality threshold** in code:
   ```cpp
   const float MIN_SIGNAL_QUALITY = 0.3;  // Lower from 0.4
   ```

### Step 3: Hardware Checks

#### Check Wiring
```
MAX30102  →  ESP32
VIN       →  3.3V  ⚠️ NOT 5V!
GND       →  GND
SDA       →  GPIO 21
SCL       →  GPIO 22
```

**Common mistakes:**
- ❌ Using 5V instead of 3.3V (can damage sensor!)
- ❌ Swapped SDA/SCL
- ❌ Loose connections
- ❌ Wrong GPIO pins

#### Check Sensor LED
When powered on, you should see:
- **Red LED** glowing on the sensor
- If no LED: Power issue or dead sensor

#### Check I2C Connection
Run I2C scanner to verify sensor address:
```cpp
// I2C Scanner code
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin();
  Serial.println("Scanning I2C...");
  
  for (byte i = 1; i < 127; i++) {
    Wire.beginTransmission(i);
    if (Wire.endTransmission() == 0) {
      Serial.print("Found device at 0x");
      Serial.println(i, HEX);
    }
  }
}

void loop() {}
```

**Expected output:**
```
Found device at 0x57  ← MAX30102 address
```

If not found:
- Check wiring
- Try different I2C pins
- Sensor may be faulty

### Step 4: Code Adjustments

If sensor is detected but still getting 0.00, try these adjustments:

#### 1. Increase LED Power
In `hospital_grade_esp32_max30102.ino`, find setup() and change:
```cpp
byte ledBrightness = 0x70;  // Increase from 0x60
particleSensor.setPulseAmplitudeRed(0x60);  // Increase from 0x50
particleSensor.setPulseAmplitudeIR(0x60);   // Increase from 0x50
```

#### 2. Lower Detection Thresholds
```cpp
const int IR_THRESHOLD = 30000;           // Lower from 50000
const float MIN_SIGNAL_QUALITY = 0.25;    // Lower from 0.4
const int MIN_SAMPLES_FOR_HR = 40;        // Lower from 50
```

#### 3. Increase Buffer Time
```cpp
const int BUFFER_SIZE = 150;              // Increase from 100
const int MIN_SAMPLES_FOR_HR = 75;        // Increase from 50
```

#### 4. Adjust Peak Detection
```cpp
const int MIN_PEAK_DISTANCE = 25;         // Lower from 30
const float PEAK_THRESHOLD_FACTOR = 0.5;  // Lower from 0.6
```

### Step 5: Finger Placement Technique

**Correct placement:**
```
     [Finger]
        |
        v
    ┌───────┐
    │ ● ● ● │  ← Sensor LEDs
    │ ● ● ● │
    └───────┘
```

**Tips:**
1. **Position**: Center of fingertip, not side
2. **Pressure**: Firm but not crushing
3. **Coverage**: Finger should cover all LEDs
4. **Stillness**: Don't move for 5-10 seconds
5. **Temperature**: Warm finger (cold = poor signal)

**Wrong placements:**
- ❌ Finger too high (nail area)
- ❌ Finger too low (pad area)
- ❌ Finger at angle
- ❌ Only partial coverage
- ❌ Too light pressure

### Step 6: Environmental Factors

**Things that affect readings:**

1. **Cold fingers** ❄️
   - Warm hands first
   - Rub hands together
   - Run warm water over hands

2. **Bright ambient light** 💡
   - Cover sensor with other hand
   - Move to darker area
   - Shield from direct sunlight

3. **Movement** 🏃
   - Sit still
   - Rest arm on table
   - Breathe normally

4. **Poor circulation** 🩸
   - Try different finger
   - Warm up first
   - Massage finger gently

5. **Nail polish** 💅
   - Remove nail polish
   - Use different finger
   - Polish blocks light

### Step 7: Expected Serial Output

When working correctly, you should see:

```
✓ Finger detected! Collecting data...
Collecting: 10/50 samples (IR: 125000, Red: 98000)
Collecting: 20/50 samples (IR: 128000, Red: 99500)
Collecting: 30/50 samples (IR: 126500, Red: 98800)
Collecting: 40/50 samples (IR: 127200, Red: 99100)
Collecting: 50/50 samples (IR: 126800, Red: 98900)

Signal - Min: 95000, Max: 155000, Amp: 60000, Threshold: 131000
✓ HR calculated: 72.3 bpm (from 4 peaks)
Signal Quality: 78% (need 40%)

✓✓✓ VALID READINGS ACHIEVED! ✓✓✓

HR: 72.3 bpm | SpO2: 98.1% | PI: 1.45% | Quality: 78% | Samples: 65 | Valid: YES
```

### Step 8: Still Not Working?

If you've tried everything above and still getting 0.00:

#### Test with Known Good Code
Try the SparkFun example:
```
File → Examples → SparkFun MAX3010x → Example5_HeartRate
```

If this works but our code doesn't:
- Issue is in our algorithm
- Report the Serial Monitor output

If SparkFun example also shows 0.00:
- Hardware issue (sensor or wiring)
- Try different sensor module
- Check for counterfeit sensors

#### Common Hardware Issues

1. **Counterfeit MAX30102**
   - Some cheap modules are fake
   - May have MAX30100 instead
   - Check markings on chip

2. **Damaged sensor**
   - Drop damage
   - ESD damage
   - Overheating

3. **Poor quality module**
   - Bad PCB design
   - Weak connections
   - Incorrect components

### Quick Fix Checklist

Try these in order:

- [ ] Run diagnostic_test.ino
- [ ] Check IR value > 100000 when finger placed
- [ ] Verify 3.3V power (NOT 5V!)
- [ ] Check wiring (SDA=21, SCL=22)
- [ ] See red LED on sensor
- [ ] Press finger FIRMLY
- [ ] Warm finger first
- [ ] Hold completely still for 10 seconds
- [ ] Cover sensor from bright light
- [ ] Try different finger
- [ ] Increase LED brightness in code
- [ ] Lower IR_THRESHOLD to 30000
- [ ] Lower MIN_SIGNAL_QUALITY to 0.25
- [ ] Wait 10-15 seconds for readings
- [ ] Check Serial Monitor for error messages
- [ ] Try SparkFun example code
- [ ] Test with different ESP32
- [ ] Test with different MAX30102 module

### Getting Help

If still not working, provide this information:

1. **Diagnostic test output** (first 20 lines)
2. **Main code Serial Monitor output** (when finger placed)
3. **IR and Red values** from diagnostic test
4. **Sensor module brand/model**
5. **ESP32 board type**
6. **Wiring photo** (if possible)
7. **What you've already tried**

Post in GitHub issues or Arduino forums with above info.

---

## Most Common Solutions

**90% of "0.00" issues are fixed by:**

1. ✅ **Press harder** - Most common issue!
2. ✅ **Warm finger** - Cold fingers = no signal
3. ✅ **Hold still** - Movement ruins readings
4. ✅ **Wait longer** - Give it 10 seconds
5. ✅ **Check wiring** - Especially 3.3V not 5V!

**Try these first before diving into code changes!**
