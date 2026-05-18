"""
Create database tables for the financial dashboard
Run this script to set up your database structure
"""
from database import get_db_connection, DB_CONFIG
import mysql.connector

def create_tables():
    """Create all required tables in the database"""
    connection = get_db_connection()
    if not connection:
        print("❌ Could not connect to database")
        return
    
    cursor = connection.cursor()
    
    print(f"\n📊 Setting up database: {DB_CONFIG['database']}")
    
    # Create transactions table
    print("\n1️⃣ Creating 'transactions' table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        description VARCHAR(255),
        category VARCHAR(100),
        amount DECIMAL(12, 2),
        type ENUM('income', 'expense') NOT NULL,
        centre VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_date (date),
        INDEX idx_type (type),
        INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    print("   ✅ Transactions table created")
    
    # Create centres table
    print("\n2️⃣ Creating 'centres' table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS centres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        revenue DECIMAL(12, 2) DEFAULT 0,
        expenses DECIMAL(12, 2) DEFAULT 0,
        profit DECIMAL(12, 2) DEFAULT 0,
        profit_margin DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    print("   ✅ Centres table created")
    
    connection.commit()
    cursor.close()
    connection.close()
    
    print("\n✅ All tables created successfully!")
    print("\nNext steps:")
    print("1. Run: python insert_sample_data.py   (to add sample data)")
    print("2. Run: python app.py                  (to start the API server)")

if __name__ == "__main__":
    print("=" * 60)
    print("🗄️  Database Setup for Financial Dashboard")
    print("=" * 60)
    create_tables()
