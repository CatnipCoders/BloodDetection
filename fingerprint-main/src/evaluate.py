import logging
from typing import Tuple, Dict, Any
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from src.data.data_loader import DataLoader
from src.utils.visualization import plot_confusion_matrix
from src.utils.config import load_config

logger = logging.getLogger(__name__)

def evaluate_model(model_path: str, config: Dict[str, Any]) -> Tuple[float, float, Dict[str, Any]]:
    """
    Evaluate the trained model on the test set.
    
    Args:
        model_path (str): Path to the saved model
        config (Dict[str, Any]): Configuration dictionary
        
    Returns:
        Tuple[float, float, Dict[str, Any]]: Test loss, accuracy, and detailed metrics
    """
    try:
        # Load model
        model = tf.keras.models.load_model(model_path)
        
        # Load test data
        data_loader = DataLoader(config['data']['dataset_path'])
        data = data_loader.load_data()
        _, valid_gen, _, test_data = data_loader.get_train_test_generators(
            data,
            img_size=tuple(config['data']['img_size']),
            batch_size=config['data']['batch_size']
        )
        
        # Evaluate model
        test_loss, test_accuracy = model.evaluate(valid_gen)
        logger.info(f"Test accuracy: {test_accuracy:.4f}")
        logger.info(f"Test loss: {test_loss:.4f}")
        
        # Get predictions
        predictions = model.predict(valid_gen)
        y_pred = np.argmax(predictions, axis=1)
        y_true = valid_gen.classes
        
        # Generate classification report
        class_names = list(valid_gen.class_indices.keys())
        metrics = classification_report(y_true, y_pred, 
                                     target_names=class_names, 
                                     output_dict=True)
        
        # Generate and plot confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        plot_confusion_matrix(cm, class_names)
        
        return test_loss, test_accuracy, metrics
        
    except Exception as e:
        logger.error(f"Error during model evaluation: {str(e)}")
        raise

if __name__ == "__main__":
    config = load_config()
    evaluate_model(config['training']['model_save_path'], config)