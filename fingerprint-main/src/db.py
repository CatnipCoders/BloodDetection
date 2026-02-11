"""Database operations for storing user blood group data."""
import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager
import logging
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    Ensures connections are properly closed and provides error handling.
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        # Enable foreign keys
        conn.execute('PRAGMA foreign_keys = ON')
        yield conn
        conn.commit()
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()

def init_db():
    """Create the SQLite database and tables if they don't exist."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            
            # Create users table
            c.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    blood_group TEXT NOT NULL,
                    confidence REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create scans history table
            c.execute('''
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    blood_group TEXT NOT NULL,
                    confidence REAL,
                    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Create vital signs table
            c.execute('''
                CREATE TABLE IF NOT EXISTS vital_signs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    spo2 REAL NOT NULL,
                    heart_rate REAL NOT NULL,
                    perfusion_index REAL,
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Create health reports table
            c.execute('''
                CREATE TABLE IF NOT EXISTS health_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    report_id TEXT UNIQUE NOT NULL,
                    blood_group TEXT,
                    spo2 REAL,
                    heart_rate REAL,
                    perfusion_index REAL,
                    spo2_status TEXT,
                    heart_rate_status TEXT,
                    overall_severity TEXT,
                    overall_summary TEXT,
                    critical_alert TEXT,
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Create indexes for better query performance
            c.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
            c.execute('CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id)')
            c.execute('CREATE INDEX IF NOT EXISTS idx_vitals_user_id ON vital_signs(user_id)')
            c.execute('CREATE INDEX IF NOT EXISTS idx_reports_user_id ON health_reports(user_id)')
            c.execute('CREATE INDEX IF NOT EXISTS idx_reports_report_id ON health_reports(report_id)')
            
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

def create_user(name: str, email: str, blood_group: str, confidence: float = None) -> int:
    """Create a new user and return their ID."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute(
                'INSERT INTO users (name, email, blood_group, confidence) VALUES (?, ?, ?, ?)',
                (name, email, blood_group, confidence)
            )
            user_id = c.lastrowid
            logger.info(f"Created user {user_id}: {name} ({email})")
            return user_id
    except sqlite3.IntegrityError as e:
        logger.warning(f"Failed to create user - email already exists: {email}")
        raise ValueError("Email already exists")
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise

def get_user(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user details by ID."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('SELECT id, name, email, blood_group, confidence, created_at, updated_at FROM users WHERE id = ?', (user_id,))
            row = c.fetchone()
            if not row:
                return None
            return dict(row)
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        raise

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user details by email."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('SELECT id, name, email, blood_group, confidence, created_at, updated_at FROM users WHERE email = ?', (email,))
            row = c.fetchone()
            if not row:
                return None
            return dict(row)
    except Exception as e:
        logger.error(f"Error fetching user by email {email}: {e}")
        raise

def update_user_blood_group(user_id: int, blood_group: str, confidence: float = None) -> bool:
    """Update a user's blood group and add to scan history."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            # First verify user exists
            c.execute('SELECT 1 FROM users WHERE id = ?', (user_id,))
            if not c.fetchone():
                return False
                
            # Update user's current blood group
            c.execute(
                'UPDATE users SET blood_group = ?, confidence = ?, updated_at = ? WHERE id = ?',
                (blood_group, confidence, datetime.now(), user_id)
            )
            
            # Add to scans history
            c.execute(
                'INSERT INTO scans (user_id, blood_group, confidence) VALUES (?, ?, ?)',
                (user_id, blood_group, confidence)
            )
            
            logger.info(f"Updated blood group for user {user_id}: {blood_group}")
            return True
    except Exception as e:
        logger.error(f"Error updating blood group for user {user_id}: {e}")
        raise

def add_vital_signs(user_id: int, spo2: float, heart_rate: float, perfusion_index: float = None) -> int:
    """Add vital signs record for a user."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute(
                'INSERT INTO vital_signs (user_id, spo2, heart_rate, perfusion_index) VALUES (?, ?, ?, ?)',
                (user_id, spo2, heart_rate, perfusion_index)
            )
            vital_id = c.lastrowid
            logger.info(f"Added vital signs for user {user_id}")
            return vital_id
    except Exception as e:
        logger.error(f"Error adding vital signs for user {user_id}: {e}")
        raise

def get_latest_vital_signs(user_id: int) -> Optional[Dict[str, Any]]:
    """Get the most recent vital signs for a user."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT spo2, heart_rate, perfusion_index, recorded_at
                FROM vital_signs
                WHERE user_id = ?
                ORDER BY recorded_at DESC
                LIMIT 1
            ''', (user_id,))
            row = c.fetchone()
            return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error fetching latest vitals for user {user_id}: {e}")
        raise

def get_vital_signs_history(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Get vital signs history for a user."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT spo2, heart_rate, perfusion_index, recorded_at
                FROM vital_signs
                WHERE user_id = ?
                ORDER BY recorded_at DESC
                LIMIT ?
            ''', (user_id, limit))
            return [dict(row) for row in c.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching vital signs history for user {user_id}: {e}")
        raise

def save_health_report(user_id: int, report_data: dict) -> int:
    """Save a generated health report."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('''
                INSERT INTO health_reports (
                    user_id, report_id, blood_group, spo2, heart_rate, perfusion_index,
                    spo2_status, heart_rate_status, overall_severity, overall_summary, critical_alert
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                report_data.get('reportId'),
                report_data.get('bloodGroup'),
                report_data.get('spo2'),
                report_data.get('heartRate'),
                report_data.get('perfusionIndex'),
                report_data.get('spo2Status'),
                report_data.get('heartRateStatus'),
                report_data.get('overallStatus', {}).get('severity'),
                report_data.get('overallStatus', {}).get('summary'),
                report_data.get('criticalAlert')
            ))
            report_db_id = c.lastrowid
            logger.info(f"Saved health report for user {user_id}")
            return report_db_id
    except Exception as e:
        logger.error(f"Error saving health report for user {user_id}: {e}")
        raise

def get_user_reports(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Get health reports for a user."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT report_id, blood_group, spo2, heart_rate, perfusion_index,
                       spo2_status, heart_rate_status, overall_severity, overall_summary,
                       critical_alert, generated_at
                FROM health_reports
                WHERE user_id = ?
                ORDER BY generated_at DESC
                LIMIT ?
            ''', (user_id, limit))
            return [dict(row) for row in c.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching reports for user {user_id}: {e}")
        raise

def list_users(limit: int = 100) -> List[Dict[str, Any]]:
    """Get list of users with their latest blood group results."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT id, name, email, blood_group, confidence, created_at, updated_at 
                FROM users 
                ORDER BY updated_at DESC
                LIMIT ?
            ''', (limit,))
            return [dict(row) for row in c.fetchall()]
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise

def get_user_history(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Get scan history for a specific user."""
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT blood_group, confidence, scanned_at
                FROM scans
                WHERE user_id = ?
                ORDER BY scanned_at DESC
                LIMIT ?
            ''', (user_id, limit))
            return [dict(row) for row in c.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching history for user {user_id}: {e}")
        raise

def get_user_complete_data(user_id: int) -> Optional[Dict[str, Any]]:
    """Get complete user data including latest vitals and reports."""
    try:
        user = get_user(user_id)
        if not user:
            return None
        
        user['latest_vitals'] = get_latest_vital_signs(user_id)
        user['vital_history'] = get_vital_signs_history(user_id, limit=5)
        user['scan_history'] = get_user_history(user_id, limit=5)
        user['reports'] = get_user_reports(user_id, limit=5)
        
        return user
    except Exception as e:
        logger.error(f"Error fetching complete data for user {user_id}: {e}")
        raise

# Initialize the database when this module is imported
init_db()