import os
import logging
from typing import Tuple, Any
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications.resnet50 import preprocess_input

logger = logging.getLogger(__name__)

class BloodGroupPredictor:
    """Class for making predictions using the trained blood group detection model."""
    
    def __init__(self, model_path: str, img_size: Tuple[int, int] = (256, 256)):
        """
        Initialize the predictor.
        
        Args:
            model_path (str): Path to the saved model
            img_size (Tuple[int, int]): Input image size
        """
        self.model = load_model(model_path)
        self.img_size = img_size
        self.class_names = ['A-', 'A+', 'AB-', 'AB+', 'B-', 'B+', 'O-', 'O+']
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess an image for prediction.
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            np.ndarray: Preprocessed image array
        """
        img = load_img(image_path, target_size=self.img_size)
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        return preprocess_input(img_array)
    
    def predict(self, image_path: str) -> Tuple[str, float]:
        """
        Make a prediction for a single image.
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            Tuple[str, float]: Predicted class and confidence score
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        try:
            processed_img = self.preprocess_image(image_path)
            predictions = self.model.predict(processed_img)
            
            predicted_class_idx = np.argmax(predictions[0])
            confidence = predictions[0][predicted_class_idx]
            
            return self.class_names[predicted_class_idx], float(confidence)
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise