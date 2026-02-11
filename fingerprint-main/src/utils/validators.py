"""
Input validation utilities for API endpoints.
Provides security and data integrity checks.
"""
import re
from typing import Optional, Tuple
from werkzeug.datastructures import FileStorage


class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass


def validate_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_blood_group(blood_group: str) -> bool:
    """
    Validate blood group format.
    
    Args:
        blood_group: Blood group to validate
        
    Returns:
        True if valid, False otherwise
    """
    valid_groups = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
    return blood_group in valid_groups


def validate_name(name: str, min_length: int = 2, max_length: int = 100) -> Tuple[bool, Optional[str]]:
    """
    Validate user name.
    
    Args:
        name: Name to validate
        min_length: Minimum allowed length
        max_length: Maximum allowed length
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not name or not isinstance(name, str):
        return False, "Name is required"
    
    name = name.strip()
    
    if len(name) < min_length:
        return False, f"Name must be at least {min_length} characters"
    
    if len(name) > max_length:
        return False, f"Name must not exceed {max_length} characters"
    
    # Check for valid characters (letters, spaces, hyphens, apostrophes)
    if not re.match(r"^[a-zA-Z\s\-']+$", name):
        return False, "Name contains invalid characters"
    
    return True, None


def validate_confidence(confidence: Optional[float]) -> Tuple[bool, Optional[str]]:
    """
    Validate confidence score.
    
    Args:
        confidence: Confidence score to validate (0.0 to 1.0)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if confidence is None:
        return True, None  # Confidence is optional
    
    try:
        conf = float(confidence)
        if not (0.0 <= conf <= 1.0):
            return False, "Confidence must be between 0.0 and 1.0"
        return True, None
    except (ValueError, TypeError):
        return False, "Confidence must be a number"


def validate_vital_signs(spo2: float, heart_rate: float, perfusion_index: Optional[float] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate vital signs values.
    
    Args:
        spo2: Blood oxygen saturation (0-100)
        heart_rate: Heart rate in BPM (20-300)
        perfusion_index: Perfusion index (0-20, optional)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Validate SpO2
    try:
        spo2_val = float(spo2)
        if not (0 <= spo2_val <= 100):
            return False, "SpO2 must be between 0 and 100"
    except (ValueError, TypeError):
        return False, "SpO2 must be a number"
    
    # Validate heart rate
    try:
        hr_val = float(heart_rate)
        if not (20 <= hr_val <= 300):
            return False, "Heart rate must be between 20 and 300 BPM"
    except (ValueError, TypeError):
        return False, "Heart rate must be a number"
    
    # Validate perfusion index if provided
    if perfusion_index is not None:
        try:
            pi_val = float(perfusion_index)
            if not (0 <= pi_val <= 20):
                return False, "Perfusion index must be between 0 and 20"
        except (ValueError, TypeError):
            return False, "Perfusion index must be a number"
    
    return True, None


def validate_image_file(file: FileStorage, allowed_extensions: set, max_size_mb: int = 16) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded image file.
    
    Args:
        file: Uploaded file object
        allowed_extensions: Set of allowed file extensions
        max_size_mb: Maximum file size in megabytes
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not file:
        return False, "No file provided"
    
    if not file.filename:
        return False, "File has no name"
    
    # Check file extension
    if '.' not in file.filename:
        return False, "File has no extension"
    
    ext = file.filename.rsplit('.', 1)[1].lower()
    if ext not in allowed_extensions:
        return False, f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
    
    # Check file size (read first chunk to verify it's not empty)
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if size == 0:
        return False, "File is empty"
    
    max_size_bytes = max_size_mb * 1024 * 1024
    if size > max_size_bytes:
        return False, f"File too large. Maximum size: {max_size_mb}MB"
    
    return True, None


def validate_user_id(user_id: any) -> Tuple[bool, Optional[str]]:
    """
    Validate user ID.
    
    Args:
        user_id: User ID to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        uid = int(user_id)
        if uid <= 0:
            return False, "User ID must be positive"
        return True, None
    except (ValueError, TypeError):
        return False, "User ID must be a valid integer"


def sanitize_string(text: str, max_length: int = 1000) -> str:
    """
    Sanitize string input by removing potentially dangerous characters.
    
    Args:
        text: Text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not text:
        return ""
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Trim to max length
    text = text[:max_length]
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def validate_pagination_params(limit: any, offset: any = 0) -> Tuple[int, int, Optional[str]]:
    """
    Validate and sanitize pagination parameters.
    
    Args:
        limit: Maximum number of records to return
        offset: Number of records to skip
        
    Returns:
        Tuple of (limit, offset, error_message)
    """
    try:
        limit_val = int(limit)
        if limit_val <= 0:
            return 10, 0, "Limit must be positive"
        if limit_val > 1000:
            limit_val = 1000  # Cap at 1000
    except (ValueError, TypeError):
        return 10, 0, "Invalid limit parameter"
    
    try:
        offset_val = int(offset)
        if offset_val < 0:
            offset_val = 0
    except (ValueError, TypeError):
        offset_val = 0
    
    return limit_val, offset_val, None
