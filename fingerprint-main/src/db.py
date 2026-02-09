"""Database operations for storing user blood group data."""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')

def init_db():
    """Create the SQLite database and tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Create users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
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
            user_id INTEGER,
            blood_group TEXT NOT NULL,
            confidence REAL,
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create vital signs table
    c.execute('''
        CREATE TABLE IF NOT EXISTS vital_signs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            spo2 REAL,
            heart_rate REAL,
            perfusion_index REAL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create health reports table
    c.execute('''
        CREATE TABLE IF NOT EXISTS health_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
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
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    conn.commit()
    conn.close()

def create_user(name: str, email: str, blood_group: str, confidence: float = None) -> int:
    """Create a new user and return their ID."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute(
            'INSERT INTO users (name, email, blood_group, confidence) VALUES (?, ?, ?, ?)',
            (name, email, blood_group, confidence)
        )
        user_id = c.lastrowid
        conn.commit()
        return user_id
    finally:
        conn.close()

def get_user(user_id: int):
    """Get user details by ID."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('SELECT id, name, email, blood_group, confidence FROM users WHERE id = ?', (user_id,))
        row = c.fetchone()
        if not row:
            return None
        return {
            'id': row[0],
            'name': row[1],
            'email': row[2],
            'blood_group': row[3],
            'confidence': row[4]
        }
    finally:
        conn.close()

def get_user_by_email(email: str):
    """Get user details by email."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('SELECT id, name, email, blood_group, confidence FROM users WHERE email = ?', (email,))
        row = c.fetchone()
        if not row:
            return None
        return {
            'id': row[0],
            'name': row[1],
            'email': row[2],
            'blood_group': row[3],
            'confidence': row[4]
        }
    finally:
        conn.close()

def update_user_blood_group(user_id: int, blood_group: str, confidence: float = None) -> bool:
    """Update a user's blood group and add to scan history."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
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
        
        conn.commit()
        return True
    finally:
        conn.close()

def add_vital_signs(user_id: int, spo2: float, heart_rate: float, perfusion_index: float = None) -> int:
    """Add vital signs record for a user."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute(
            'INSERT INTO vital_signs (user_id, spo2, heart_rate, perfusion_index) VALUES (?, ?, ?, ?)',
            (user_id, spo2, heart_rate, perfusion_index)
        )
        vital_id = c.lastrowid
        conn.commit()
        return vital_id
    finally:
        conn.close()

def get_latest_vital_signs(user_id: int):
    """Get the most recent vital signs for a user."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute('''
            SELECT spo2, heart_rate, perfusion_index, recorded_at
            FROM vital_signs
            WHERE user_id = ?
            ORDER BY recorded_at DESC
            LIMIT 1
        ''', (user_id,))
        row = c.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_vital_signs_history(user_id: int, limit: int = 10):
    """Get vital signs history for a user."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute('''
            SELECT spo2, heart_rate, perfusion_index, recorded_at
            FROM vital_signs
            WHERE user_id = ?
            ORDER BY recorded_at DESC
            LIMIT ?
        ''', (user_id, limit))
        return [dict(row) for row in c.fetchall()]
    finally:
        conn.close()

def save_health_report(user_id: int, report_data: dict) -> int:
    """Save a generated health report."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
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
        conn.commit()
        return report_db_id
    finally:
        conn.close()

def get_user_reports(user_id: int, limit: int = 10):
    """Get health reports for a user."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
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
    finally:
        conn.close()

def list_users(limit: int = 100):
    """Get list of users with their latest blood group results."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column-based access
    c = conn.cursor()
    try:
        c.execute('''
            SELECT id, name, email, blood_group, confidence, created_at, updated_at 
            FROM users 
            ORDER BY updated_at DESC
            LIMIT ?
        ''', (limit,))
        return [dict(row) for row in c.fetchall()]
    finally:
        conn.close()

def get_user_history(user_id: int, limit: int = 10):
    """Get scan history for a specific user."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute('''
            SELECT blood_group, confidence, scanned_at
            FROM scans
            WHERE user_id = ?
            ORDER BY scanned_at DESC
            LIMIT ?
        ''', (user_id, limit))
        return [dict(row) for row in c.fetchall()]
    finally:
        conn.close()

def get_user_complete_data(user_id: int):
    """Get complete user data including latest vitals and reports."""
    user = get_user(user_id)
    if not user:
        return None
    
    user['latest_vitals'] = get_latest_vital_signs(user_id)
    user['vital_history'] = get_vital_signs_history(user_id, limit=5)
    user['scan_history'] = get_user_history(user_id, limit=5)
    user['reports'] = get_user_reports(user_id, limit=5)
    
    return user

# Initialize the database when this module is imported
init_db()