from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .model import BloodGroupPredictor
import logging

app = FastAPI(
    title="Fingerprint Blood Group Detection API",
    description="Predict blood group from fingerprint images",
    version="1.0.0"
)

# CORS configuration for JavaScript frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model
predictor = BloodGroupPredictor("models/resnet_model.pth")

@app.get("/")
async def root():
    return {
        "message": "Fingerprint Blood Group Detection API",
        "version": "1.0.0",
        "endpoints": {
            "predict": "/predict",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/predict")
async def predict_blood_group(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )
    
    try:
        # Read image bytes
        contents = await file.read()
        
        # Make prediction
        result = predictor.predict(contents)
        
        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "prediction": result
        })
    
    except Exception as e:
        logging.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )
