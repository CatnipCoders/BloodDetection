"""
Configuration management for the Flask application.
Centralizes all environment variables and provides validation.
"""
import os
from typing import Optional

class Config:
    """Application configuration with environment variable validation."""
    
    # Server Configuration
    HOST: str = os.environ.get('HOST', '0.0.0.0')
    PORT: int = int(os.environ.get('PORT', '5000'))
    DEBUG: bool = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Model Configuration
    MODEL_PATH: str = os.environ.get('MODEL_PATH', 'model_blood_group_detection_resnet.h5')
    MODEL_INPUT_SIZE: tuple = (224, 224)  # EfficientNetB3 input size
    
    # Database Configuration
    DB_PATH: str = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'users.db'))
    
    # Security Configuration
    MAX_CONTENT_LENGTH: int = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    ALLOWED_EXTENSIONS: set = {'bmp', 'png', 'jpg', 'jpeg', 'gif'}
    
    # CORS Configuration
    CORS_ORIGINS: str = os.environ.get('CORS_ORIGINS', '*')  # In production, set specific origins
    
    # Blood Group Labels
    BLOOD_GROUP_LABELS: list = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
    
    # Logging Configuration
    LOG_LEVEL: str = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Rate Limiting (for production)
    RATE_LIMIT_ENABLED: bool = os.environ.get('RATE_LIMIT_ENABLED', 'False').lower() == 'true'
    RATE_LIMIT_PER_MINUTE: int = int(os.environ.get('RATE_LIMIT_PER_MINUTE', '60'))
    
    # API Configuration
    API_TIMEOUT: int = int(os.environ.get('API_TIMEOUT', '30'))  # seconds
    
    @classmethod
    def validate(cls) -> bool:
        """Validate critical configuration values."""
        errors = []
        
        # Validate port range
        if not (1 <= cls.PORT <= 65535):
            errors.append(f"Invalid PORT: {cls.PORT}. Must be between 1 and 65535.")
        
        # Validate max content length
        if cls.MAX_CONTENT_LENGTH < 1024:
            errors.append(f"MAX_CONTENT_LENGTH too small: {cls.MAX_CONTENT_LENGTH}")
        
        # Validate model input size
        if not isinstance(cls.MODEL_INPUT_SIZE, tuple) or len(cls.MODEL_INPUT_SIZE) != 2:
            errors.append("MODEL_INPUT_SIZE must be a tuple of (width, height)")
        
        if errors:
            for error in errors:
                print(f"Configuration Error: {error}")
            return False
        
        return True
    
    @classmethod
    def get_cors_origins(cls) -> list:
        """Parse CORS origins from environment variable."""
        if cls.CORS_ORIGINS == '*':
            return '*'
        return [origin.strip() for origin in cls.CORS_ORIGINS.split(',')]
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode."""
        return os.environ.get('FLASK_ENV', 'development') == 'production'
    
    @classmethod
    def print_config(cls):
        """Print current configuration (excluding sensitive data)."""
        print("=" * 60)
        print("APPLICATION CONFIGURATION")
        print("=" * 60)
        print(f"Environment: {'PRODUCTION' if cls.is_production() else 'DEVELOPMENT'}")
        print(f"Host: {cls.HOST}")
        print(f"Port: {cls.PORT}")
        print(f"Debug: {cls.DEBUG}")
        print(f"Model Path: {cls.MODEL_PATH}")
        print(f"Model Input Size: {cls.MODEL_INPUT_SIZE}")
        print(f"Database Path: {cls.DB_PATH}")
        print(f"Max Upload Size: {cls.MAX_CONTENT_LENGTH / (1024*1024):.1f} MB")
        print(f"CORS Origins: {cls.CORS_ORIGINS}")
        print(f"Log Level: {cls.LOG_LEVEL}")
        print(f"Rate Limiting: {'Enabled' if cls.RATE_LIMIT_ENABLED else 'Disabled'}")
        print("=" * 60)


# Validate configuration on import
if not Config.validate():
    raise ValueError("Invalid configuration. Please check environment variables.")
