import json
import logging
import os
from typing import Dict, Any

def load_config(config_path: str = "config/config.json") -> Dict[str, Any]:
    """
    Load configuration from JSON file.
    
    Args:
        config_path (str): Path to the configuration file
        
    Returns:
        Dict[str, Any]: Configuration dictionary
    """
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config

def setup_logging(config: Dict[str, Any]) -> None:
    """
    Set up logging configuration.
    
    Args:
        config (Dict[str, Any]): Configuration dictionary containing logging settings
    """
    log_dir = config['logging']['log_dir']
    os.makedirs(log_dir, exist_ok=True)
    
    logging.basicConfig(
        level=getattr(logging, config['logging']['level']),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_dir, 'app.log')),
            logging.StreamHandler()
        ]
    )