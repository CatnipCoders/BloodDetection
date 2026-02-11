"""
Centralized logging configuration for the application.
Provides structured logging with rotation and different log levels.
"""
import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path


def setup_logger(
    name: str = 'bloodgroup',
    log_level: str = 'INFO',
    log_dir: str = 'logs',
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> logging.Logger:
    """
    Setup and configure application logger.
    
    Args:
        name: Logger name
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory for log files
        max_bytes: Maximum size of each log file before rotation
        backup_count: Number of backup files to keep
        
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create logs directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console Handler (stdout)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File Handler with rotation (all logs)
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_path / 'app.log',
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Error File Handler (errors only)
    error_handler = logging.handlers.RotatingFileHandler(
        filename=log_path / 'error.log',
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    # Access Log Handler (for API requests)
    access_handler = logging.handlers.RotatingFileHandler(
        filename=log_path / 'access.log',
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    access_handler.setLevel(logging.INFO)
    access_formatter = logging.Formatter(
        '%(asctime)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    access_handler.setFormatter(access_formatter)
    
    # Create separate logger for access logs
    access_logger = logging.getLogger(f'{name}.access')
    access_logger.setLevel(logging.INFO)
    access_logger.addHandler(access_handler)
    access_logger.propagate = False
    
    return logger


def log_request(logger: logging.Logger, method: str, path: str, status_code: int, duration_ms: float):
    """
    Log HTTP request in structured format.
    
    Args:
        logger: Logger instance
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration_ms: Request duration in milliseconds
    """
    access_logger = logging.getLogger(f'{logger.name}.access')
    access_logger.info(
        f'{method} {path} - {status_code} - {duration_ms:.2f}ms'
    )


def log_prediction(logger: logging.Logger, image_hash: str, predicted_label: str, confidence: float):
    """
    Log blood group prediction.
    
    Args:
        logger: Logger instance
        image_hash: Hash of the input image
        predicted_label: Predicted blood group
        confidence: Prediction confidence
    """
    logger.info(
        f'Prediction - Image: {image_hash}, Label: {predicted_label}, Confidence: {confidence:.4f}'
    )


def log_database_operation(logger: logging.Logger, operation: str, table: str, record_id: int = None):
    """
    Log database operation.
    
    Args:
        logger: Logger instance
        operation: Operation type (INSERT, UPDATE, DELETE, SELECT)
        table: Table name
        record_id: Record ID (if applicable)
    """
    if record_id:
        logger.debug(f'DB {operation} - Table: {table}, ID: {record_id}')
    else:
        logger.debug(f'DB {operation} - Table: {table}')


def log_error_with_context(logger: logging.Logger, error: Exception, context: dict = None):
    """
    Log error with additional context.
    
    Args:
        logger: Logger instance
        error: Exception object
        context: Additional context dictionary
    """
    error_msg = f'Error: {type(error).__name__}: {str(error)}'
    if context:
        error_msg += f' | Context: {context}'
    logger.error(error_msg, exc_info=True)


# Create default logger instance
default_logger = setup_logger()
