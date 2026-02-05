# 🚀 How to Upload Code to ESP32

## ⚡ Quick Upload (30 seconds)

### Step 1: Close Arduino IDE
```
1. Close ALL Arduino IDE windows
2. Wait 5 seconds
```

**Why**: Arduino IDE caches code. Closing ensures new changes are loaded.

### Step 2: Open Arduino IDE
```
1. Open Arduino IDE
2. Wait for it to fully load
```

### Step 3: Open the Code File
```
For testing:
File → Open → esp32 code/simple_test/simple_test.ino

For main code:
File → Open → esp32 code/hospital_grade_esp32_max30102/hospital_grade_esp32_max30102.ino
```

### Step 4: Select Board
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
```

### Step 5: Select Port
```
Tools → Port → COM# (ESP32)
```

**Note**: The COM number depends on your system. Look for "ESP32" or "USB Serial".

### Step 6: Upload
```
1. Click the Upload button (→) at the top
2. Wait for "Connecting..."
3. Wait for "Writing at 0x..."
4. Wait for "Done uploading"
```

**Time**: Usually 20-30 seconds

### Step 7: Open Serial Monitor
```
1. Tools → Serial Monitor
2. Set baud rate: 115200
3. You should see output from the ESP32
```

---

## 🔍 Detailed Instructions

### Before You Start

**Required:**
- Arduino IDE installed
- ESP32 board support installed
- USB cable connected
- ESP32 powered on

**Check:**
- USB cable is data cable (not charge-only)
- ESP32 is recognized by computer
- Correct COM port selected

---

## 📋 Step-by-Step with Screenshots

### 1. Close Arduino IDE Completely

**Why**: Ensures new code changes are loaded from disk.

**How**:
- Close all Arduino IDE windows
- Check taskbar/dock for hidden windows
- Wait 5 seconds

### 2. Open Arduino IDE

**How**:
- Double-click Arduino IDE icon
- Wait for it to fully load
- You should see a blank sketch

### 3. Open Your Code File

**For Testing** (recommended first):
```
File → Open
Navigate to: C:\Users\Meow\Desktop\project meow\esp32 code\simple_test\
Select: simple_test.ino
Click: Open
```

**For Main Code** (after testing works):
```
File → Open
Navigate to: C:\Users\Meow\Desktop\project meow\esp32 code\hospital_grade_esp32_max30102\
Select: hospital_grade_esp32_max30102.ino
Click: Open
```

### 4. Configure Board Settings

**Board**:
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
```

**Upload Speed**:
```
Tools → Upload Speed → 115200
```

**Flash Frequency**:
```
Tools → Flash Frequency → 80MHz
```

**Partition Scheme**:
```
Tools → Partition Scheme → Default 4MB with spiffs
```

### 5. Select COM Port

**Windows**:
```
Tools → Port → COM# (ESP32)
```

**How to find the right port**:
1. Unplug ESP32
2. Check Tools → Port (note available ports)
3. Plug in ESP32
4. Check Tools → Port again
5. New port is your ESP32

**Common ports**:
- Windows: COM3, COM4, COM5, etc.
- Mac: /dev/cu.usbserial-*
- Linux: /dev/ttyUSB0, /dev/ttyUSB1

### 6. Upload Code

**Method 1: Upload Button**
```
1. Click the Upload button (→) at the top left
2. Wait for compilation
3. Wait for upload
4. Look for "Done uploading"
```

**Method 2: Menu**
```
Sketch → Upload
```

**Method 3: Keyboard**
```
Ctrl+U (Windows/Linux)
Cmd+U (Mac)
```

### 7. Monitor Upload Progress

**You should see**:
```
Compiling sketch...
Sketch uses 234567 bytes (17%) of program storage space
Connecting........___....
Writing at 0x00001000... (10%)
Writing at 0x00002000... (20%)
...
Writing at 0x0000f000... (100%)
Leaving...
Hard resetting via RTS pin...
Done uploading.
```

**Time**: 20-40 seconds depending on code size

### 8. Open Serial Monitor

**How**:
```
Tools → Serial Monitor
```

**Or**:
```
Ctrl+Shift+M (Windows/Linux)
Cmd+Shift+M (Mac)
```

**Configure**:
```
1. Set baud rate: 115200 (bottom right)
2. Set line ending: Both NL & CR (bottom left)
```

**You should see**:
```
=== SIMPLE MAX30102 TEST ===

Sensor ready!
Place finger on sensor...
```

---

## 🔧 Troubleshooting Upload Issues

### Issue: "Port not found"

**Cause**: ESP32 not recognized by computer

**Solutions**:
1. **Check USB cable**: Use data cable, not charge-only
2. **Install drivers**: Download CH340 or CP2102 drivers
3. **Try different USB port**: Some ports don't work well
4. **Restart computer**: Sometimes helps with driver issues

**Windows driver download**:
- CH340: https://sparks.gogo.co.nz/ch340.html
- CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

### Issue: "Connecting........" forever

**Cause**: ESP32 not entering upload mode

**Solutions**:
1. **Hold BOOT button**: Hold while clicking Upload, release after "Connecting..."
2. **Press RESET**: Press RESET button after "Connecting..." appears
3. **Lower upload speed**: Tools → Upload Speed → 115200
4. **Check cable**: Try different USB cable

**Manual upload mode**:
```
1. Hold BOOT button
2. Press RESET button
3. Release RESET button
4. Release BOOT button
5. Click Upload
```

### Issue: "Compilation error"

**Cause**: Missing libraries or syntax errors

**Solutions**:
1. **Install libraries**: Sketch → Include Library → Manage Libraries
   - Search: "MAX30105"
   - Install: "SparkFun MAX3010x Pulse and Proximity Sensor Library"
2. **Check code**: Make sure you opened the .ino file, not a random file
3. **Close and reopen**: Close IDE, reopen, try again

### Issue: "Upload failed"

**Cause**: Various issues

**Solutions**:
1. **Check port**: Make sure correct COM port selected
2. **Close Serial Monitor**: Can't upload while Serial Monitor is open
3. **Restart ESP32**: Unplug, wait 5 seconds, plug back in
4. **Try different USB port**: Some ports have issues

### Issue: "Permission denied" (Linux/Mac)

**Cause**: No permission to access serial port

**Solution**:
```bash
# Linux
sudo usermod -a -G dialout $USER
# Then log out and log back in

# Mac
sudo chmod 666 /dev/cu.usbserial-*
```

---

## 📊 Upload Checklist

Before uploading, verify:

- [ ] Arduino IDE closed and reopened
- [ ] Correct .ino file opened
- [ ] Board: ESP32 Dev Module
- [ ] Port: Correct COM port selected
- [ ] Upload Speed: 115200
- [ ] USB cable connected
- [ ] ESP32 powered on
- [ ] Serial Monitor closed (if open)

---

## 🎯 After Upload

### 1. Open Serial Monitor
```
Tools → Serial Monitor
Baud rate: 115200
```

### 2. Check Output
```
You should see:
=== SIMPLE MAX30102 TEST ===
Sensor ready!
Place finger on sensor...
```

### 3. Test with Finger
```
1. Place finger on sensor
2. Hold still for 20 seconds
3. Watch for heart rate reading
```

### 4. Expected Result
```
=== ANALYSIS ===
Min: 119843 | Max: 126363 | Amp: 6520.00
Mean: 123794 | Threshold: 125750
Peaks found: 2-3

>>> HEART RATE: 70-80 bpm <<<
Confidence: HIGH
```

---

## 💡 Tips

### For Faster Uploads
1. **Close Serial Monitor**: Can't upload while it's open
2. **Use USB 2.0 port**: USB 3.0 sometimes has issues
3. **Short cable**: Shorter USB cables work better
4. **Direct connection**: Don't use USB hubs

### For Reliable Uploads
1. **Always close IDE first**: Ensures new code is loaded
2. **Wait for "Done uploading"**: Don't unplug too early
3. **Check Serial Monitor**: Verify code is running
4. **Test immediately**: Make sure it works

### For Debugging
1. **Serial Monitor is your friend**: Shows what's happening
2. **Baud rate must match**: 115200 in code and Serial Monitor
3. **Watch for errors**: Red text in Serial Monitor means error
4. **Share output**: If stuck, share Serial Monitor output

---

## 🚀 Quick Reference

### Upload Simple Test
```
1. Close IDE
2. Open IDE
3. File → Open → simple_test/simple_test.ino
4. Tools → Board → ESP32 Dev Module
5. Tools → Port → COM# (ESP32)
6. Click Upload (→)
7. Tools → Serial Monitor (115200 baud)
8. Place finger and test
```

### Upload Main Code
```
1. Close IDE
2. Open IDE
3. File → Open → hospital_grade_esp32_max30102/hospital_grade_esp32_max30102.ino
4. Tools → Board → ESP32 Dev Module
5. Tools → Port → COM# (ESP32)
6. Click Upload (→)
7. Tools → Serial Monitor (115200 baud)
8. Place finger and test
```

---

## 🎉 Success!

If you see output in Serial Monitor, upload was successful!

**Next steps**:
1. Test with finger
2. Check heart rate reading
3. If correct (70-80 BPM): You're done! 🎉
4. If wrong (140-160 BPM): See [DOUBLE_COUNTING_FIX.md](DOUBLE_COUNTING_FIX.md)

---

## 📞 Need Help?

If upload fails, share:
1. **Error message**: Copy from Arduino IDE (orange/red text)
2. **Board selected**: Tools → Board
3. **Port selected**: Tools → Port
4. **Operating system**: Windows/Mac/Linux
5. **Arduino IDE version**: Help → About

**Common error messages**:
- "Port not found" → Check USB cable and drivers
- "Connecting..." forever → Hold BOOT button during upload
- "Compilation error" → Install MAX30105 library
- "Upload failed" → Close Serial Monitor and try again
