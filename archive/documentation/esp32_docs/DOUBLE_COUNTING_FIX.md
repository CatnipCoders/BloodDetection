# Fix: Double-Counting Peaks (140-160 BPM instead of 70-80 BPM)

## 🔍 Issue Identified

You're getting 140-160 BPM while sitting still, but your actual heart rate is likely 70-80 BPM.

**Problem**: The algorithm is detecting **2 peaks per heartbeat** instead of 1.

### Why This Happens

Each heartbeat has multiple phases:
```
Systolic peak (main)  ← Should detect this
    ↗↘
   ↗  ↘
  ↗    ↘
 ↗      ↘← Diastolic notch (should ignore)
↗        ↘
```

The algorithm was detecting both the systolic peak AND the diastolic notch, counting them as 2 separate heartbeats.

**Result**: 2× the actual heart rate (70 BPM → 140 BPM)

---

## ✅ Solution Applied

### 1. Increased Minimum Peak Distance
- **Before**: 25 samples (0.25 seconds)
- **After**: 50 samples (0.5 seconds)
- **Why**: At 140 BPM, peaks are 0.43s apart. At 70 BPM, peaks are 0.86s apart.

### 2. Stricter Peak Validation
- **Before**: 2-point validation (check i-1, i+1)
- **After**: 3-point validation (check i-1, i-2, i-3, i+1, i+2, i+3)
- **Why**: Ensures we're detecting true peaks, not noise or notches

### 3. Debug Output
- Shows each peak position and timing
- Helps verify peaks are ~0.8-1.0 seconds apart (60-75 BPM)

---

## 🚀 Upload Fixed Code

### Step 1: Re-upload Simple Test
```
1. Close Arduino IDE
2. Reopen Arduino IDE
3. File → Open → simple_test/simple_test.ino
4. Upload
5. Serial Monitor (115200 baud)
6. Place finger
7. Hold VERY STILL for 20 seconds
```

### Step 2: Check Peak Timing

**Expected output:**
```
=== ANALYSIS ===
...
Peak 1 at sample 45 (0.45s), value: 125000
Peak 2 at sample 120 (1.20s), value: 126000
Peak 3 at sample 195 (1.95s), value: 125500

Total peaks found: 3
>>> HEART RATE: 70-80 bpm <<<
```

**Key check**: Peaks should be ~0.75-1.0 seconds apart (not 0.4-0.5 seconds)

### Step 3: If Good → Upload Main Code
```
1. File → Open → hospital_grade_esp32_max30102/hospital_grade_esp32_max30102.ino
2. Upload
3. Should now show correct heart rate!
```

---

## 📊 Peak Timing Analysis

### What You Were Seeing (140-160 BPM)
```
Peak 1 at 0.25s
Peak 2 at 0.50s  ← Only 0.25s apart (double-counting!)
Peak 3 at 0.75s
Peak 4 at 1.00s  ← Only 0.25s apart (double-counting!)

Interval: 0.25s
BPM: 60 / 0.25 = 240 BPM per peak
But averaging gives: 140-160 BPM
```

### What You Should See (70-80 BPM)
```
Peak 1 at 0.45s
Peak 2 at 1.20s  ← 0.75s apart (correct!)
Peak 3 at 1.95s  ← 0.75s apart (correct!)

Interval: 0.75s
BPM: 60 / 0.75 = 80 BPM ✓
```

---

## 🎯 Expected Results

### Before Fix
```
Reading: 140-160 BPM
Peak spacing: 0.25-0.4 seconds
Peaks per second: 2.5-4
Diagnosis: Double-counting
```

### After Fix
```
Reading: 70-80 BPM
Peak spacing: 0.75-1.0 seconds
Peaks per second: 1-1.3
Diagnosis: Correct!
```

---

## 💡 How to Verify It's Working

### Check 1: Peak Count
```
Buffer size: 150 samples = 1.5 seconds

At 70 BPM: 1.17 beats/second
→ 1.5 seconds = ~1.75 beats = 2-3 peaks ✓

At 140 BPM (double-counting): 2.33 beats/second
→ 1.5 seconds = ~3.5 beats = 4-7 peaks ✗
```

**If you see 4+ peaks in 1.5 seconds → Still double-counting**

### Check 2: Peak Spacing
```
Look at the debug output:
Peak 1 at sample 45 (0.45s)
Peak 2 at sample 120 (1.20s)

Spacing: 1.20 - 0.45 = 0.75 seconds ✓

If spacing < 0.5 seconds → Double-counting
If spacing 0.7-1.0 seconds → Correct!
```

### Check 3: Heart Rate Range
```
Resting (sitting): 60-80 BPM ✓
Light activity: 80-100 BPM
Moderate activity: 100-120 BPM

If showing 140-160 while sitting → Wrong!
If showing 70-80 while sitting → Correct!
```

---

## 🔧 If Still Showing 140-160 BPM

### Option 1: Increase Peak Distance Further

Edit `simple_test.ino`:
```cpp
// Change this line:
(i - lastPeak) >= 60)  // Increase from 50 to 60 (0.6 seconds)
```

### Option 2: Increase Threshold

Edit `simple_test.ino`:
```cpp
// Change this line:
float peakThreshold = (amplitude < 20000) ? mean + (amplitude * 0.3) : threshold;
// Increase 0.3 to 0.4 for stricter detection
```

### Option 3: Check for Movement

- **Ensure complete stillness**
- Movement can create false peaks
- Rest arm on table
- Don't talk or breathe deeply

---

## 📈 Understanding Your Signal

### Normal Heartbeat Waveform
```
     Systolic peak (main peak)
         ↗↘
        ↗  ↘
       ↗    ↘
      ↗      ↘ Dicrotic notch (should ignore)
     ↗        ↘
    ↗          ↘
   ↗            ↘
  ↗              ↘
 ↗                ↘
```

**Goal**: Detect only the systolic peak, ignore the dicrotic notch

### With Flat Signal
```
Your signal has low amplitude, so both peaks are close in height:

  ↗↘  ← Systolic (125000)
 ↗  ↘
↗    ↘← Dicrotic (124500) - only 500 difference!
```

**Solution**: Stricter validation + longer minimum distance

---

## 🎯 Calibration for Your Signal

Based on your flat signal (amplitude ~6500):

1. **Minimum peak distance**: 50 samples (0.5 seconds)
   - Prevents detecting dicrotic notch
   - Ensures only one peak per heartbeat

2. **3-point validation**: Check ±3 samples
   - Ensures true peak, not noise
   - Rejects small fluctuations

3. **Adaptive threshold**: 20% of amplitude
   - Works with flat signals
   - Detects subtle peaks

---

## 🚀 Action Plan

1. **Re-upload simple_test.ino** (close IDE first!)
2. **Hold finger still for 20 seconds**
3. **Check peak spacing in output**
   - Should be 0.7-1.0 seconds apart
   - Should see 2-3 peaks total
4. **Check heart rate**
   - Should be 60-90 BPM (if resting)
   - NOT 140-160 BPM
5. **Share results!**

---

## 📞 What to Share

If still showing 140-160 BPM, share:

1. **Peak timing output**:
   ```
   Peak 1 at sample ___ (___s)
   Peak 2 at sample ___ (___s)
   Peak 3 at sample ___ (___s)
   ```

2. **Peak spacing**: Time between peaks (should be 0.7-1.0s)

3. **Total peaks found**: Should be 2-3 in 1.5 seconds

---

## 🎉 Summary

**Issue**: Double-counting peaks (detecting 2 peaks per heartbeat)
**Cause**: Minimum distance too short (0.25s), detecting dicrotic notch
**Solution**: Increased to 0.5s minimum, stricter validation
**Expected**: 70-80 BPM instead of 140-160 BPM

**The fixed code should now show your actual heart rate!** 🎯
