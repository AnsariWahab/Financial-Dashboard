"""
Check and display your database schema
This helps verify your table structure matches what the API expects
"""
from database import get_db_connection
import mysql.connector

def check_schema():
    """Check if the required table and columns exist"""
    connection = get_db_connection()
    if not connection:
        print("❌ Could not connect to database")
        return
    
    cursor = connection.cursor()
    
    print("=" * 70)
    print("🗄️  OMOTEC Database Schema Check")
    print("=" * 70)
    
    # Check what tables exist
    print("\n1️⃣ Checking available tables...")
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    
    if not tables:
        print("   ⚠️  No tables found in database!")
        print("\n   Your database is empty. You need to:")
        print("   - Create a table (e.g., 'financials')")
        print("   - Import your data")
        return
    
    print(f"   ✅ Found {len(tables)} table(s):")
    for table in tables:
        print(f"      - {table[0]}")
    
    # Check the main table (adjust table name if different)
    table_name = 'financials'
    
    print(f"\n2️⃣ Checking '{table_name}' table structure...")
    try:
        cursor.execute(f"DESCRIBE {table_name}")
        columns = cursor.fetchall()
        
        print(f"   ✅ Table '{table_name}' exists with {len(columns)} columns:")
        print("\n   Column Name          | Type              | Null | Key")
        print("   " + "-" * 60)
        for col in columns:
            print(f"   {col[0]:20} | {col[1]:17} | {col[2]:4} | {col[3]}")
        
        # Check for required columns
        print("\n3️⃣ Checking required columns...")
        required_columns = [
            'source_year', 'month', 'segment', 'branch', 
            'pnl_categories', 'value'
        ]
        
        optional_columns = [
            'Student_name', 'school_type', 'research_category'
        ]
        
        existing_cols = [col[0] for col in columns]
        
        for req_col in required_columns:
            if req_col in existing_cols:
                print(f"   ✅ {req_col}")
            else:
                print(f"   ❌ {req_col} - MISSING (required)")
        
        print("\n   Optional columns (for Impact Metrics):")
        for opt_col in optional_columns:
            if opt_col in existing_cols:
                print(f"   ✅ {opt_col}")
            else:
                print(f"   ⚠️  {opt_col} - missing (optional)")
        
        # Show sample data
        print("\n4️⃣ Sample data from table...")
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
        sample_rows = cursor.fetchall()
        
        if sample_rows:
            print(f"   ✅ Found {len(sample_rows)} sample row(s):")
            for i, row in enumerate(sample_rows, 1):
                print(f"\n   Row {i}:")
                for j, col in enumerate(columns):
                    print(f"      {col[0]:20} = {row[j]}")
        else:
            print("   ⚠️  Table is empty - no data found")
        
        # Show row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"\n5️⃣ Total rows in table: {count}")
        
        # Show distinct values for filters
        print("\n6️⃣ Filter values available:")
        
        filter_columns = ['source_year', 'month', 'segment', 'branch']
        for col in filter_columns:
            if col in existing_cols:
                cursor.execute(f"SELECT DISTINCT {col} FROM {table_name} WHERE {col} IS NOT NULL ORDER BY {col}")
                values = [row[0] for row in cursor.fetchall()]
                print(f"   {col:15} : {', '.join(map(str, values[:5]))}{' ...' if len(values) > 5 else ''}")
        
    except mysql.connector.Error as e:
        if "doesn't exist" in str(e):
            print(f"   ❌ Table '{table_name}' does not exist!")
            print("\n   💡 Tip: Update 'table_name' variable in backend/database.py")
            print("          to match your actual table name.")
        else:
            print(f"   ❌ Error: {e}")
    
    cursor.close()
    connection.close()
    
    print("\n" + "=" * 70)
    print("✅ Schema check complete!")
    print("=" * 70)


def suggest_schema():
    """Suggest CREATE TABLE statement if table doesn't exist"""
    print("\n📝 Suggested table structure:")
    print("""
CREATE TABLE financials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_year VARCHAR(20),
    month VARCHAR(20),
    segment VARCHAR(50),
    branch VARCHAR(50),
    pnl_categories VARCHAR(100),
    value DECIMAL(15, 2),
    Student_name VARCHAR(100),
    school_type VARCHAR(50),
    research_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_year (source_year),
    INDEX idx_segment (segment),
    INDEX idx_branch (branch),
    INDEX idx_category (pnl_categories)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")


if __name__ == "__main__":
    check_schema()
    print("\n" + "💡" * 35)
    print("\nNext steps:")
    print("1. If table exists with data → Run: python app.py")
    print("2. If table is empty → Import your data")
    print("3. If table doesn't exist → Create it and import data")
    print("4. If column names differ → Update backend/database.py query")
    suggest_schema()
