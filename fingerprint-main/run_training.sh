#!/bin/bash
# Enhanced Blood Group Detection Training Script (Linux/Mac)

echo "========================================"
echo "Blood Group Detection - Enhanced Training"
echo "========================================"

# Activate virtual environment if exists
if [ -d "myenv" ]; then
    source myenv/bin/activate
fi

# Install requirements
echo "Installing dependencies..."
pip install -r requirements_enhanced.txt

# Run training
echo "Starting training..."
python enhanced_training.py

echo "========================================"
echo "Training Complete!"
echo "========================================"
