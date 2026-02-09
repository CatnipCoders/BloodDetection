---
inclusion: always
---

# Blood Group Detection System - Project Understanding

## 🎯 Project Overview

This is a **comprehensive health monitoring system** that combines:
1. **Blood Group Detection from Fingerprints** using Deep Learning (TensorFlow/Keras)
2. **Real-time Vital Signs Monitoring** using ESP32 + MAX30102 sensor
3. **Health Report Generation** with PDF export capabilities
4. **SecuGen Hamster Pro 20** fingerprint scanner integration

**Tech Stack:**
- **Backend:** Python Flask + TensorFlow/Keras (fingerprint-main/)
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS (AApp_module/)
- **Hardware:** ESP32 + MAX30102 sensor, SecuGen Hamster Pro 20 scanner
- **Database:** SQLite (users.db)
- **ML Models:** ResNet50, EfficientNetB3, ResNet101, DenseNet169

---

## 📁 Project Structure

```
blood-group-project/
├── fingerprint-main/              # Backend - ML Model & API
│   ├── src/
│   │   ├── app.py                 # Flask API server (main entry point)
│   │   ├── db.py                  # SQLite database operations
│   │   ├── train.py               # Basic training script
│   │   ├── data/data_loader.py    # Dataset loading & preprocessing
│   │   ├── models/resnet.py       # ResNet50 model architecture
│   │   └── utils/                 # Utilities (predictor, visualization)
│   ├── dataset/dataset_blood_group/  # Training dataset (8 blood groups)
│   ├── enhanced_training.py       # Advanced training with ensemble
│   ├── colab_training.py          # Google Colab training script
│   ├── requirements.txt           # Python dependencies
│   ├── start.bat                  # Quick start script
│   └── myenv/                     # Python virtual environment
│
├── AApp_module/                   # Frontend - Next.js Application
│   ├── app/
│   │   ├── page.tsx               # Home page
│   │   ├── scan/page.tsx          # Fingerprint scanning page
│   │   ├── vitals/page.tsx        # Vital signs monitoring
│   │   ├── report/page.tsx        # Health report generation
│   │   ├── admin/page.tsx         # Admin dashboard
│   │   └── register/page.tsx      # User registration
│   ├── components/
│   │   ├── fingerprint-scanner.tsx  # SecuGen scanner component
│   │   └── ui/                    # Shadcn UI components
│   ├── lib/
│   │   ├── api.ts                 # Backend API client
│   │   ├── api-client.ts          # Extended API functions
│   │   ├── secugen-sdk.ts         # SecuGen scanner SDK wrapper
│   │   └── health-report.ts       # Health report generation logic
│   ├── package.json               # Node dependencies
│   └── start.bat                  # Quick start script
│
└── esp32 code/                    # ESP32 Firmware
    ├── hospital_grade_esp32_max30102.ino  # Main firmware
    └── config.h                   # WiFi & sensor configuration
```

---

## 🔄 System Workflow

### 1. User Registration & Blood Group Detection
```
User → Scan Page → SecuGen Scanner/Upload Image
  ↓
Capture Fingerprint (BMP format)
  ↓
Send to Backend: POST /predict
  ↓
TensorFlow Model Processing (ResNet50/EfficientNetB3)
  ↓
Blood Group Detection (A+, A-, AB+, AB-, B+, B-, O+, O-)
  ↓
Save to Database: POST /api/users
  ↓
Display Result + Confidence Score
```

### 2. Vital Signs Monitoring
```
User → Vitals Page → ESP32 Device
  ↓
Place Finger on MAX30102 Sensor
  ↓
ESP32 Reads: SpO2, Heart Rate, Perfusion Index
  ↓
Send to Frontend: GET http://ESP32_IP/api/vitals
  ↓
Real-time Display with Charts
  ↓
Save to Database: POST /api/users/{id}/vitals
```

### 3. Health Report Generation
```
User → Report Page
  ↓
Fetch User Data (blood group + latest vitals)
  ↓
Analyze Health Status (lib/health-report.ts)
  ↓
Generate Recommendations & Alerts
  ↓
Display Report + Export PDF (jsPDF)
  ↓
Save Report: POST /api/users/{id}/reports
```

---

## 🧠 Machine Learning Models

### Current Model (Production)
- **Architecture:** ResNet50 (transfer learning)
- **Input Size:** 256x256 RGB images
- **Output:** 8 classes (blood groups)
- **Training:** 80/20 train-test split
- **Accuracy:** ~85-90%

### Enhanced Models (Advanced Training)
Located in `enhanced_training.py`:

1. **EfficientNetB3** (Recommended)
   - Input: 299x299
   - Best accuracy/speed ratio
   - Fine-tuning: Top 50 layers

2. **ResNet101** (Deep Learning)
   - More layers than ResNet50
   - Better feature extraction

3. **DenseNet169** (Dense Connections)
   - Feature reuse
   - Memory efficient

### Training Techniques
- **Two-Phase Training:** Head training → Fine-tuning
- **Data Augmentation:** Rotation, zoom, brightness, shear
- **Class Balancing:** Weighted loss for imbalanced data
- **K-Fold Cross Validation:** 5-fold validation
- **Ensemble Learning:** Combine 3 models for higher accuracy
- **Test-Time Augmentation (TTA):** 10 augmentations per prediction
- **Mixed Precision Training:** Float16 for speed

### Expected Accuracy
- Original: 85-90%
- With fine-tuning: 92-95%
- With ensemble + TTA: 95-98%
- With all techniques: 97-99%+

---

## 🔌 API Endpoints

### Backend (Flask - Port 5000)

#### Health & Prediction
- `GET /health` - Health check
- `POST /predict` - Blood group prediction from fingerprint image
  - Body: multipart/form-data with 'image' field
  - Response: `{label: "A+", confidence: 0.98}`

#### User Management
- `POST /api/users` - Create new user
  - Body: `{name, email, blood_group, confidence?}`
- `GET /api/users` - List all users (limit: 100)
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}/blood-group` - Update blood group
- `GET /api/users/{id}/history` - Get scan history
- `GET /api/users/{id}/complete` - Get complete user data

#### Vital Signs
- `POST /api/users/{id}/vitals` - Add vital signs
  - Body: `{spo2, heart_rate, perfusion_index?}`
- `GET /api/users/{id}/vitals` - Get vital signs history (limit: 10)

#### Health Reports
- `POST /api/users/{id}/reports` - Save health report
- `GET /api/users/{id}/reports` - Get user reports (limit: 10)

### ESP32 (Port 80)
- `GET /` - Web dashboard
- `GET /api/vitals` - Get current vital signs
  - Response: `{heartRate, spo2, perfusionIndex, fingerDetected, dataValid, signalQuality, confidence}`
- `GET /status` - Device status & uptime
- `GET /calibrate` - Reset sensor calibration

---

## 🗄️ Database Schema (SQLite)

### users table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    blood_group TEXT NOT NULL,
    confidence REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### vital_signs table
```sql
CREATE TABLE vital_signs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    spo2 REAL NOT NULL,
    heart_rate REAL NOT NULL,
    perfusion_index REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### health_reports table
```sql
CREATE TABLE health_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_data TEXT NOT NULL,  -- JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### scan_history table
```sql
CREATE TABLE scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    blood_group TEXT NOT NULL,
    confidence REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🛠️ Development Commands

### Backend Setup
```bash
cd fingerprint-main

# Automated setup (recommended)
set.bat                    # Creates venv, installs dependencies

# Manual setup
python -m venv myenv
myenv\Scripts\activate
pip install -r requirements.txt

# Start server
start.bat                  # Or: python src\app.py
```

### Frontend Setup
```bash
cd AApp_module

# Install dependencies
npm install

# Start development server
npm run dev                # Or: .\start.bat

# Build for production
npm run build
npm start
```

### ESP32 Setup
1. Open `esp32 code/config.h`
2. Set WiFi credentials: `WIFI_SSID`, `WIFI_PASSWORD`
3. Upload to ESP32 using Arduino IDE
4. Get IP address from Serial Monitor
5. Update frontend: `NEXT_PUBLIC_ESP32_API_URL`

### Training Models
```bash
cd fingerprint-main

# Basic training
python src/train.py

# Enhanced training (local)
python enhanced_training.py

# Colab training
# Upload Blood_Group_Detection_Colab_Kaggle.ipynb to Google Colab
```

---

## 🔧 Configuration Files

### Backend Environment
No `.env` file needed. Configuration via environment variables:
- `MODEL_PATH` - Path to .h5 model file (default: model_blood_group_detection_resnet.h5)
- `PORT` - Server port (default: 5000)
- `LABELS` - Comma-separated blood group labels

### Frontend Environment (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ESP32_API_URL=http://192.168.1.193/api/vitals
NEXT_PUBLIC_SECUGEN_API_URL=http://localhost:8443
```

### ESP32 Configuration (config.h)
```cpp
#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourPassword"
#define ENABLE_SERIAL_DEBUG true
#define ENABLE_API_AUTH false
#define API_KEY "your-secret-key"
```

---

## 🎨 Frontend Pages

### 1. Home Page (`/`)
- Welcome screen
- Navigation to all features
- Quick stats display

### 2. Scan Page (`/scan`)
- SecuGen Hamster Pro 20 integration
- Auto-detect scanner on load
- Capture fingerprint or upload image
- Real-time blood group detection
- Display confidence score
- Register new user

### 3. Vitals Page (`/vitals`)
- Connect to ESP32 device
- Real-time vital signs monitoring
- Charts for SpO2, Heart Rate, Perfusion Index
- Historical data display
- Save readings to database

### 4. Report Page (`/report`)
- Select user
- Fetch latest vitals + blood group
- Generate comprehensive health report
- Health status analysis (Normal/Warning/Critical)
- Personalized recommendations
- Export to PDF

### 5. Admin Page (`/admin`)
- View all users
- Search and filter
- View user history
- Manage records

### 6. Register Page (`/register`)
- Manual user registration
- Form validation
- Blood group selection

---

## 🔐 Security Considerations

### Current Implementation (Development)
- ✅ CORS enabled for local development
- ✅ Input validation on API endpoints
- ✅ SQL injection prevention (parameterized queries)
- ⚠️ No authentication/authorization
- ⚠️ No HTTPS (local only)

### Production Requirements
- [ ] Add user authentication (JWT/OAuth)
- [ ] Enable HTTPS (SSL certificates)
- [ ] Restrict CORS to specific origins
- [ ] Add API rate limiting
- [ ] Encrypt sensitive data
- [ ] Implement RBAC (Role-Based Access Control)
- [ ] Add audit logging
- [ ] Comply with GDPR/CCPA for biometric data
- [ ] Secure ESP32 API with authentication

---

## 🐛 Common Issues & Solutions

### Backend Issues

**1. TensorFlow DLL Error**
```
ImportError: DLL load failed while importing _pywrap_tensorflow_internal
```
**Solution:**
- Install Microsoft Visual C++ Redistributable 2015-2022
- Reinstall TensorFlow: `pip uninstall tensorflow && pip install tensorflow==2.15.0`
- Use compatible Python version (3.8-3.11)

**2. Model Not Found**
```
FileNotFoundError: Model file not found
```
**Solution:**
- Set `MODEL_PATH` environment variable
- Place model in project root or `test/` folder
- Retrain model using `enhanced_training.py`

**3. Database Locked**
```
sqlite3.OperationalError: database is locked
```
**Solution:**
- Close other connections to `users.db`
- Restart Flask server
- Check file permissions

### Frontend Issues

**1. API Connection Failed**
```
Failed to fetch users
```
**Solution:**
- Verify backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Disable firewall/antivirus temporarily
- Check CORS configuration

**2. SecuGen Scanner Not Detected**
```
SecuGen scanner not found
```
**Solution:**
- Install SecuGen drivers
- Start SecuGen Web API service
- Verify service at `http://localhost:8443/sgwebapi/info`
- Check USB connection
- Restart computer

**3. ESP32 Connection Failed**
```
Failed to fetch vitals
```
**Solution:**
- Verify ESP32 is powered on
- Check WiFi connection (same network)
- Update `NEXT_PUBLIC_ESP32_API_URL` with correct IP
- Test ESP32 API: `curl http://ESP32_IP/api/vitals`

### ESP32 Issues

**1. No Finger Detected**
```
IR value < threshold
```
**Solution:**
- Clean sensor surface
- Press finger firmly
- Adjust `FINGER_DETECTION_THRESHOLD` in code
- Increase LED brightness

**2. Invalid Heart Rate**
```
HR out of range or 0
```
**Solution:**
- Keep finger still during measurement
- Wait 5-10 seconds for stabilization
- Adjust `MIN_PEAK_DISTANCE` for faster/slower heart rates
- Check sensor wiring (SDA→21, SCL→22)

---

## 📊 Performance Optimization

### Backend
- Use model caching (loaded once on first request)
- Enable mixed precision training (float16)
- Batch predictions for multiple images
- Use GPU if available (CUDA)

### Frontend
- Lazy load components
- Optimize images (WebP format)
- Use React.memo for expensive components
- Implement pagination for large lists
- Cache API responses

### ESP32
- Reduced buffer size (150 samples = 1.5 seconds)
- Fast peak detection algorithm
- Optimized sensor configuration
- 100Hz sampling rate
- 2-3 second response time

---

## 🚀 Deployment Checklist

### Backend
- [ ] Set production environment variables
- [ ] Use production WSGI server (Gunicorn/uWSGI)
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Add monitoring (Sentry, New Relic)
- [ ] Implement logging
- [ ] Add health check endpoint

### Frontend
- [ ] Build production bundle: `npm run build`
- [ ] Set production API URLs
- [ ] Enable HTTPS
- [ ] Configure CDN for static assets
- [ ] Add error tracking
- [ ] Implement analytics
- [ ] Optimize bundle size
- [ ] Add service worker for offline support

### Hardware
- [ ] Secure ESP32 with authentication
- [ ] Use static IP or mDNS
- [ ] Add OTA (Over-The-Air) updates
- [ ] Implement watchdog timer
- [ ] Add battery backup (optional)
- [ ] Calibrate sensors regularly

---

## 📚 Key Technologies

### Backend
- **Flask** - Lightweight web framework
- **TensorFlow/Keras** - Deep learning framework
- **SQLite** - Embedded database
- **Pillow** - Image processing
- **NumPy** - Numerical computing
- **Flask-CORS** - Cross-origin resource sharing

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Accessible component library
- **Recharts** - Charting library
- **jsPDF** - PDF generation
- **React Hook Form** - Form validation
- **Zod** - Schema validation

### Hardware
- **ESP32** - WiFi-enabled microcontroller
- **MAX30102** - Pulse oximeter sensor
- **SecuGen Hamster Pro 20** - Fingerprint scanner

---

## 🎯 Future Enhancements

### Planned Features
1. **Multi-user Support** - User accounts with authentication
2. **Historical Trends** - Long-term health tracking
3. **Alerts & Notifications** - Critical health alerts
4. **Mobile App** - React Native or Flutter
5. **Cloud Sync** - Backup to cloud storage
6. **AI Recommendations** - Personalized health advice
7. **Integration with Wearables** - Fitbit, Apple Watch
8. **Telemedicine** - Share reports with doctors
9. **Multi-language Support** - Internationalization
10. **Advanced Analytics** - ML-powered insights

### Model Improvements
1. **Larger Dataset** - Collect more fingerprint samples
2. **Data Augmentation** - More diverse training data
3. **Hyperparameter Tuning** - Optuna optimization
4. **Model Compression** - TensorFlow Lite for edge devices
5. **Explainable AI** - Grad-CAM visualizations
6. **Active Learning** - Improve model with user feedback

---

## 📖 Documentation Files

- `REadme.md` - Main project README
- `fingerprint-main/README.md` - Backend setup guide
- `fingerprint-main/PROJECT_WORKFLOW_README.md` - Workflow diagram
- `fingerprint-main/ENHANCED_MODEL_README.md` - Advanced training guide
- `SECUGEN_SETUP_GUIDE.md` - SecuGen scanner setup
- `SECUGEN_INTEGRATION_SUMMARY.md` - Integration details
- `.kiro/steering/project-understanding.md` - This file

---

## 💡 Development Tips

### When Working on Backend
1. Always activate virtual environment: `myenv\Scripts\activate`
2. Test endpoints with Postman or curl
3. Check Flask logs for errors
4. Use `ENABLE_SERIAL_DEBUG=true` for verbose logging
5. Keep model file in project root or set `MODEL_PATH`

### When Working on Frontend
1. Use TypeScript for type safety
2. Follow Next.js App Router conventions
3. Use Shadcn UI components for consistency
4. Test on multiple browsers
5. Check browser console for errors

### When Working on ESP32
1. Use Serial Monitor for debugging
2. Set `ENABLE_SERIAL_DEBUG true` in config.h
3. Test sensor readings before integration
4. Keep firmware updated
5. Document any hardware changes

### When Training Models
1. Use GPU for faster training (Colab/Kaggle)
2. Save checkpoints regularly
3. Monitor validation accuracy
4. Use TensorBoard for visualization
5. Test model before deployment

---

## 🤝 Contributing Guidelines

### Code Style
- **Python:** PEP 8, type hints, docstrings
- **TypeScript:** ESLint, Prettier, strict mode
- **C++:** Arduino style guide

### Git Workflow
1. Create feature branch: `git checkout -b feature/name`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push to remote: `git push origin feature/name`
4. Create pull request
5. Code review and merge

### Commit Messages
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Tests
- `chore:` - Maintenance

---

## 📞 Support & Resources

### Official Documentation
- TensorFlow: https://www.tensorflow.org/
- Next.js: https://nextjs.org/docs
- Flask: https://flask.palletsprojects.com/
- ESP32: https://docs.espressif.com/
- SecuGen: https://www.secugen.com/developers/

### Community
- Stack Overflow: Tag questions with relevant tech
- GitHub Issues: Report bugs and feature requests
- Discord/Slack: Join developer communities

---

**Last Updated:** February 6, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready (Development Mode)

---

## 🎓 Learning Resources

### For Understanding the Codebase
1. Start with `REadme.md` - Overall project structure
2. Read `fingerprint-main/PROJECT_WORKFLOW_README.md` - Data flow
3. Explore `src/app.py` - API endpoints
4. Check `app/scan/page.tsx` - Frontend integration
5. Review `enhanced_training.py` - ML training pipeline

### For Deep Learning
- TensorFlow tutorials: https://www.tensorflow.org/tutorials
- Transfer learning guide: https://keras.io/guides/transfer_learning/
- Image classification: https://www.tensorflow.org/tutorials/images/classification

### For Next.js
- Next.js tutorial: https://nextjs.org/learn
- App Router guide: https://nextjs.org/docs/app
- TypeScript handbook: https://www.typescriptlang.org/docs/

### For ESP32
- ESP32 getting started: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/
- MAX30102 library: https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library
- Arduino ESP32: https://github.com/espressif/arduino-esp32

---

**Remember:** This is a medical-adjacent application. Always prioritize accuracy, security, and user privacy. Never use for critical medical decisions without proper validation and regulatory approval.
