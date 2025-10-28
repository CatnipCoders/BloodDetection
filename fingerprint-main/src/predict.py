import argparse
import logging
from src.utils.predictor import BloodGroupPredictor
from src.utils.config import load_config, setup_logging

def main():
    parser = argparse.ArgumentParser(description='Predict blood group from fingerprint image')
    parser.add_argument('image_path', type=str, help='Path to the fingerprint image')
    parser.add_argument('--model', type=str, help='Path to the model file',
                      default='models/blood_group_detection_model.h5')
    parser.add_argument('--config', type=str, help='Path to config file',
                      default='config/config.json')
    
    args = parser.parse_args()
    
    # Load configuration and setup logging
    config = load_config(args.config)
    setup_logging(config)
    logger = logging.getLogger(__name__)
    
    try:
        # Initialize predictor
        predictor = BloodGroupPredictor(
            model_path=args.model,
            img_size=tuple(config['data']['img_size'])
        )
        
        # Make prediction
        blood_group, confidence = predictor.predict(args.image_path)
        
        print(f"\nPrediction Results:")
        print(f"Blood Group: {blood_group}")
        print(f"Confidence: {confidence:.2%}")
        
    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}")
        raise

if __name__ == "__main__":
    main()