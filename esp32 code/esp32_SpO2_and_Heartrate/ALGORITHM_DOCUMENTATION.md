# MAX30102 Algorithm Documentation

## Overview

This document explains the algorithms used for heart rate detection and SpO2 calculation with the MAX30102 sensor.

## Table of Contents

1. [Sensor Basics](#sensor-basics)
2. [Heart Rate Detection Algorithm](#heart-rate-detection-algorithm)
3. [SpO2 Calculation Algorithm](#spo2-calculation-algorithm)
4. [Signal Quality Assessment](#signal-quality-assessment)
5. [Implementation Details](#implementation-details)

---

## Sensor Basics

### MAX30102 Specifications

- **Type**: Integrated Pulse Oximeter and Heart Rate Sensor
- **LEDs**: Red (660nm) and Infrared (880nm)
- **Communication**: I2C (Standard/Fast mode)
- **ADC Resolution**: 18-bit
- **Sample Rate**: 50-3200 Hz (configurable)
- **Power Supply**: 1.8V (sensor) + 3.3V (LEDs)

### How It Works

The MAX30102 uses **Photoplethysmography (PPG)**:

1. **LED Emission**: Red and IR LEDs shine light into tissue
2. **Light Absorption**: Oxygenated and deoxygenated blood absorb different wavelengths
3. **Photodetector**: Measures reflected light intensity
4. **Signal Processing**: Analyzes variations to extract vital signs

### PPG Signal Components

```
PPG Signal = DC Component + AC Component + Noise

DC Component: Constant tissue absorption (baseline)
AC Component: Pulsatile blood flow (heartbeat)
Noise: Motion artifacts, ambient light
```

---

## Heart Rate Detection Algorithm

### Method: Peak Detection

Heart rate is calculated by detecting peaks in the IR signal, which correspond to heartbeats.

### Algorithm Steps

#### 1. Signal Buffering
```cpp
// Store 100 samples in circular buffer (1 second at 100Hz)
SensorData sensorBuffer[100];
```

#### 2. Peak Detection
```cpp
// Find local maxima that exceed threshold
for each sample i:
    if (signal[i] > threshold AND
        signal[i] > signal[i-1] AND
        signal[i] > signal[i-2] AND
        signal[i] > signal[i+1] AND
        signal[i] > signal[i+2]):
        
        // Check minimum distance from last peak (300ms)
        if (i - lastPeak >= 30 samples):
            peaks.add(i)
```

**Threshold Calculation:**
```cpp
threshold = maxValue * 0.7  // 70% of maximum signal
```

#### 3. Inter-Beat Interval (IBI) Calculation
```cpp
// Calculate time between consecutive peaks
for each pair of peaks:
    interval = peak[i+1] - peak[i]  // in samples
    
    // Filter unrealistic intervals
    if (interval >= 30 AND interval <= 200):  // 30-200 BPM range
        validIntervals.add(interval)
```

#### 4. Heart Rate Calculation
```cpp
// Convert average interval to BPM
avgInterval = sum(validIntervals) / count(validIntervals)
heartRate = (60 * sampleRate) / avgInterval

// Example: avgInterval = 100 samples at 100Hz
// heartRate = (60 * 100) / 100 = 60 BPM
```

#### 5. Moving Average Filter
```cpp
// Smooth heart rate using 10-sample history
heartRateSmoothed = average(last 10 heart rates)
```

### Valid Heart Rate Range

- **Minimum**: 40 BPM (bradycardia threshold)
- **Maximum**: 200 BPM (tachycardia threshold)
- **Typical Resting**: 60-100 BPM

---

## SpO2 Calculation Algorithm

### Method: R-Value (Ratio of Ratios)

SpO2 is calculated using the ratio of red and infrared light absorption.

### Theoretical Background

**Beer-Lambert Law**: Light absorption is proportional to concentration

```
Oxygenated Hemoglobin (HbO2): Absorbs more IR, less Red
Deoxygenated Hemoglobin (Hb): Absorbs more Red, less IR
```

### Algorithm Steps

#### 1. Extract DC and AC Components

**DC Component (Baseline):**
```cpp
DC_red = average(red_samples)
DC_ir = average(ir_samples)
```

**AC Component (Pulsatile):**
```cpp
AC_red = standardDeviation(red_samples)
AC_ir = standardDeviation(ir_samples)

// Standard deviation formula:
AC = sqrt(sum((sample - DC)^2) / count)
```

#### 2. Calculate Normalized Ratios

```cpp
// Normalize AC by DC to remove individual variations
redRatio = AC_red / DC_red
irRatio = AC_ir / DC_ir
```

#### 3. Calculate R-Value

```cpp
// R is the ratio of normalized ratios
R = redRatio / irRatio
R = (AC_red / DC_red) / (AC_ir / DC_ir)
```

**Physical Meaning:**
- High R (>1.0): More red absorption → Lower SpO2
- Low R (<0.5): More IR absorption → Higher SpO2

#### 4. Apply Empirical Formula

Multiple calibration formulas exist:

**Formula 1 (Common):**
```cpp
SpO2 = 110 - 25 * R
```

**Formula 2 (Alternative):**
```cpp
SpO2 = 104 - 17 * R
```

**Formula 3 (Polynomial):**
```cpp
SpO2 = -45.060 * R^2 + 30.354 * R + 94.845
```

**Our Implementation:**
```cpp
SpO2 = 110 - 25 * R

// Clamp to valid range
if (SpO2 > 100) SpO2 = 100
if (SpO2 < 70) SpO2 = 0  // Below 70% is unrealistic
```

#### 5. Moving Average Filter

```cpp
// Average last 25 R-values for stability
R_avg = average(last 25 R-values)
SpO2 = 110 - 25 * R_avg
```

### Valid SpO2 Range

- **Normal**: 95-100%
- **Mild Hypoxemia**: 90-94%
- **Moderate Hypoxemia**: 85-89%
- **Severe Hypoxemia**: <85%
- **Critical**: <70% (sensor likely invalid)

### Calibration Notes

⚠️ **Important**: The empirical formulas are approximations and may need calibration for:
- Different skin tones
- Different finger sizes
- Ambient temperature
- Individual physiology

For medical-grade accuracy, calibration against a certified pulse oximeter is required.

---

## Signal Quality Assessment

### Purpose

Determine if the sensor readings are reliable before calculating vitals.

### Quality Metrics

#### 1. Signal-to-Noise Ratio (SNR)

```cpp
// Approximate SNR calculation
SNR_ir = AC_ir / (DC_ir * 0.01)  // Assume 1% noise
SNR_red = AC_red / (DC_red * 0.01)

// Normalize to 0-1 scale
quality = min(1.0, (SNR_ir + SNR_red) / 40.0)
```

#### 2. AC Component Threshold

```cpp
// Minimum AC amplitude for valid signal
if (AC_ir < 100 OR AC_red < 100):
    signal_invalid = true
```

#### 3. Finger Detection

```cpp
// IR value threshold for finger presence
if (IR_value < 50000):
    finger_not_detected = true
```

### Quality Thresholds

- **Excellent**: Quality > 0.8
- **Good**: Quality > 0.6
- **Fair**: Quality > 0.5
- **Poor**: Quality < 0.5 (reject data)

---

## Implementation Details

### Sampling Strategy

```cpp
Sample Rate: 100 Hz (100 samples/second)
Buffer Size: 100 samples (1 second of data)
Update Rate: Real-time (every 10ms)
```

### Data Flow

```
1. Read Sensor (10ms interval)
   ↓
2. Store in Circular Buffer (100 samples)
   ↓
3. Check Finger Detection (IR threshold)
   ↓
4. Calculate Signal Quality
   ↓
5. If Quality > 0.5:
   ├─→ Detect Peaks → Calculate HR
   └─→ Extract AC/DC → Calculate SpO2
   ↓
6. Validate Results (range check)
   ↓
7. Apply Moving Average Filter
   ↓
8. Update Current Vitals
```

### Circular Buffer

```cpp
// Efficient memory usage - no shifting required
buffer[index] = newValue
index = (index + 1) % BUFFER_SIZE

// When full, oldest data is automatically overwritten
```

### Performance Optimization

1. **Non-blocking**: Sensor reading doesn't block web server
2. **Efficient Math**: Pre-calculated constants, minimal divisions
3. **Memory**: Fixed buffers, no dynamic allocation
4. **CPU**: ~5% usage on ESP32 @ 240MHz

### Timing Characteristics

- **Sensor Read**: ~2ms
- **Peak Detection**: ~5ms
- **SpO2 Calculation**: ~3ms
- **Total Processing**: ~10ms per cycle
- **API Response**: <5ms

---

## Troubleshooting

### Common Issues

#### 1. Erratic Heart Rate

**Causes:**
- Finger movement
- Weak contact pressure
- Low signal quality

**Solutions:**
- Increase buffer size for more averaging
- Adjust peak threshold
- Improve finger placement instructions

#### 2. Incorrect SpO2

**Causes:**
- Uncalibrated formula
- Poor perfusion
- Ambient light interference

**Solutions:**
- Try alternative formulas
- Increase LED brightness
- Shield sensor from light
- Calibrate against reference device

#### 3. No Finger Detection

**Causes:**
- Weak LED brightness
- Poor sensor contact
- Damaged sensor

**Solutions:**
- Increase LED brightness (0x3F-0xFF)
- Check wiring and power supply
- Test with known-good sensor

#### 4. Slow Response

**Causes:**
- Large buffer size
- Heavy filtering

**Solutions:**
- Reduce buffer size (trade-off: less stable)
- Reduce moving average window
- Increase sample rate

---

## References

### Academic Papers

1. **Photoplethysmography and its application in clinical physiological measurement**
   - John Allen, Physiological Measurement, 2007

2. **A Novel Algorithm for the Determination of Qualitative SpO2 from the Photoplethysmogram**
   - Yongbo Liang et al., IEEE, 2011

3. **Pulse oximetry: understanding its basic principles facilitates appreciation of its limitations**
   - J. M. Sinex, Respiratory Care, 1999

### Datasheets

- [MAX30102 Datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX30102.pdf) - Maxim Integrated (Analog Devices)

### Libraries

- [SparkFun MAX3010x Library](https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library) - Arduino library with examples

### Online Resources

- [Maker Portal - Arduino Heart Rate Monitor](https://makersportal.com/blog/2019/6/24/arduino-heart-rate-monitor-using-max30102-and-pulse-oximetry)
- [Components101 - MAX30102 Guide](https://components101.com/sensors/max30102-sensor-oximeter-and-heart-rate-pinout-datasheet)

---

## License

This algorithm documentation is provided for educational purposes as part of the Blood Group Detection System project.

**Medical Disclaimer**: This implementation is for educational and research purposes only. It is NOT intended for medical diagnosis or treatment. Always consult certified medical devices and healthcare professionals for medical decisions.

---

## Version History

- **v3.0** - Advanced algorithm with peak detection and R-value SpO2
- **v2.0** - Basic implementation with simple calculations
- **v1.0** - Initial sensor integration

---

## Contact

For questions or improvements to these algorithms, please refer to the main project documentation.
