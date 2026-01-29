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

# Initialize the database when this module is imported
init_db()