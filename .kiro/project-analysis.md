# Blood Group Detection Project - Comprehensive Analysis

## Project Overview
This is a sophisticated biometric health monitoring system that combines machine learning, web development, and IoT hardware to create a complete blood group detection and vital signs monitoring platform.

## Architecture Overview

### Two-Tier System Architecture
- **Backend**: Flask API (Python) with TensorFlow/Keras ML models
- **Frontend**: Next.js 14 web application with TypeScript and Tailwind CSS
- **Hardware**: ESP32 microcontroller with MAX30105 sensor for vital signs

### Data Flow
1. User scans fingerprint → Image processed by ML model → Blood group detected
2. User registration with detected blood group → SQLite database storage
3. ESP32 streams real-time vital signs → Web dashboard display
4. Admin panel for user management and data export

## Key Components

### 1. Machine Learning Pipeline (`fingerprint-main/`)

**Advanced ML Architecture:**
- **Models**: ResNet50, EfficientNetB3, ResNet101, DenseNet169 (ensemble approach)
- **Input**: 256×256 RGB fingerprint images
- **Output**: 8 blood group classes (A+, A-, B+, B-, AB+, AB-, O+, O-)
- **Expected Accuracy**: 95-99% with all enhancement techniques

**Advanced Training Features:**
- **Data Augmentation**: Rotation, zoom, brightness, shear transformations
- **Class Balancing**: Weighted loss for imbalanced datasets
- **Ensemble Learning**: Combines 3 models for robust predictions
- **Test-Time Augmentation**: 10 augmented predictions averaged
- **K-Fold Cross Validation**: 5-fold validation for reliability
- **Mixed Precision Training**: float16 for GPU/TPU optimization
- **Multi-Platform Support**: Kaggle, Google Colab, Local training

**Key Files:**
- `enhanced_training.py` - Main training script with all advanced techniques
- `src/models/resnet.py` - Model architecture definitions
- `src/data/data_loader.py` - Data preprocessing and augmentation
- `predict_enhanced.py` - Inference with TTA support

### 2. Web Application (`AApp_module/`)

**Frontend Features:**
- **Home Dashboard**: 4 main features (Scan, Register, Vitals, Admin)
- **Fingerprint Scanning**: Device detection + image upload fallback
- **User Registration**: Pre-filled with detected blood group
- **Admin Panel**: User search, filtering, PDF ID card export
- **Vital Signs Monitor**: Real-time SpO2 and heart rate display

**Technical Stack:**
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS + shadcn/ui components
- Real-time polling for vital signs (100ms intervals)

**Key Files:**
- `app/page.tsx` - Home dashboard
- `app/scan/page.tsx` - Fingerprint scanning interface
- `app/admin/page.tsx` - Admin management panel
- `app/vitals/page.tsx` - Real-time vital signs monitoring
- `lib/api.ts` - Centralized API client

### 3. Backend API (`fingerprint-main/src/`)

**Flask API Endpoints:**
- `GET /health` - Server health check
- `POST /predict` - Fingerprint image classification
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/{id}/blood-group` - Update blood group
- `GET /api/users/{id}/history` - User scan history

**Database Schema (SQLite):**
- **Users Table**: id, name, email, blood_group, confidence, timestamps
- **Scans Table**: id, user_id, blood_group, confidence, scanned_at

**Key Files:**
- `src/app.py` - Flask API server with CORS support
- `src/db.py` - Database operations and schema
- `src/predict.py` - Model inference utilities

### 4. Hardware Integration (`esp32 code/`)

**ESP32 Configuration:**
- **Sensor**: MAX30102 optical sensor (SpO2 + Heart Rate)
- **WiFi**: Connects to local network for API access
- **API Endpoint**: `/api/vitals` returning JSON data
- **Thresholds**: Heart Rate (40-200 bpm), SpO2 (70-100%)

**Optimized Performance:**
- **Response Time**: 2-3 seconds (optimized from 10+ seconds)
- **Buffer Size**: 100 samples (reduced from 200)
- **Early Calculation**: Starts after 50 samples for HR, 30 for SpO2
- **Sensor Config**: 100Hz sampling, 411μs pulse width, 18-bit resolution
- **LED Settings**: 50% brightness, higher current for better signal

**Real-time Monitoring:**
- Frontend polls ESP32 every 100ms
- Live charts display vital signs trends
- Color-coded alerts for abnormal readings
- Web interface updates every 500ms

## Setup Instructions

### Backend Setup (Windows)
```bash
cd fingerprint-main
.\set.bat          # Creates virtual environment and installs dependencies
.\start.bat        # Starts Flask server on port 5000
```

### Frontend Setup
```bash
cd AApp_module
npm install        # Install Node.js dependencies
npm run dev        # Start Next.js development server on port 3000
```

### Environment Configuration
Create `AApp_module/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ESP32_API_URL=http://192.168.1.100/api/vitals
```

### ESP32 Setup
1. Configure WiFi credentials in `esp32 code/config.h`
2. Upload code to ESP32 with MAX30105 sensor
3. Note ESP32 IP address for frontend configuration

## Advanced Features

### Multi-Platform Training
- **Local**: Standard Python environment
- **Kaggle**: Optimized for Kaggle kernels with dataset integration
- **Google Colab**: TPU support with enhanced performance
- **Distributed**: Train across platforms, aggregate with ensemble methods

### Production Considerations
- Use WSGI server (Gunicorn) instead of Flask dev server
- Implement proper authentication and API key validation
- Add comprehensive logging and error handling
- Consider Docker containerization for deployment
- Enable HTTPS for secure data transmission

## Current Status
✅ Complete ML pipeline with advanced techniques
✅ Functional web application with all core features
✅ Hardware integration ready for deployment
✅ Comprehensive documentation and setup scripts
✅ Multi-platform training support
✅ Real-time vital signs monitoring
✅ Admin panel with user management

## Next Steps
- Deploy to production environment
- Implement user authentication
- Add data backup and recovery
- Enhance security measures
- Scale for multiple concurrent users