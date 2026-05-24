"""
Database connection module for MySQL
Connects to your dashboard database
"""
import mysql.connector
from mysql.connector import Error
import pandas as pd
from decimal import Decimal
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'dashboard'),
    'port': int(os.getenv('DB_PORT', 3306)),
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            print(f"✅ Connected to MySQL database: {DB_CONFIG['database']}")
            return connection
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None


def _convert_decimals(df: pd.DataFrame) -> pd.DataFrame:
    """
    MySQL returns DECIMAL columns as Python decimal.Decimal objects.
    These are incompatible with float arithmetic in measures.py.
    This converts all Decimal columns to float64.
    """
    for col in df.columns:
        if df[col].dtype == object:
            sample = df[col].dropna()
            if len(sample) > 0 and isinstance(sample.iloc[0], Decimal):
                df[col] = df[col].astype(float)
    return df


def execute_query(query, params=None):
    connection = get_db_connection()
    if connection is None:
        return []
    try:
        cursor = connection.cursor(dictionary=True)
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        connection.close()
        return results
    except Error as e:
        print(f"❌ Error executing query: {e}")
        return []

def execute_insert(query, params=None):
    connection = get_db_connection()
    if connection is None:
        return False
    try:
        cursor = connection.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        connection.commit()
        cursor.close()
        connection.close()
        return True
    except Error as e:
        print(f"❌ Error executing insert: {e}")
        return False

def get_financials(source_year=None, month=None, segment=None, branch=None):
    """
    Fetch financial data from your database with optional filters.
    Returns a pandas DataFrame matching your Dash app structure.
    """

    # Normalize source_year format: FY24-25 → FY24_25 (DB uses underscores)
    if source_year and source_year != 'All':
        source_year = source_year.replace('-', '_')

    connection = get_db_connection()
    if connection is None:
        return pd.DataFrame()

    try:
        query = """
        SELECT 
            source_year,
            month,
            segment,
            branch,
            pnl_categories,
            value,
            Student_name,
            school_type,
            research_category
        FROM financials
        WHERE 1=1
        """

        params = []

        if source_year and source_year != 'All':
            query += " AND source_year = %s"
            params.append(source_year)

        if month and month != 'All':
            query += " AND month = %s"
            params.append(month)

        if segment and segment != 'All':
            query += " AND segment = %s"
            params.append(segment)

        if branch and branch != 'All':
            query += " AND branch = %s"
            params.append(branch)

        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params if params else None)
        rows = cursor.fetchall()
        cursor.close()
        connection.close()

        df = pd.DataFrame(rows)
        if not df.empty:
            df = _convert_decimals(df)
        return df

    except Error as e:
        print(f"❌ Error fetching financials: {e}")
        connection.close()
        return pd.DataFrame()  


def get_distinct_values(column_name):
    connection = get_db_connection()
    if connection is None:
        return []
    try:
        query = f"SELECT DISTINCT {column_name} FROM financials WHERE {column_name} IS NOT NULL ORDER BY {column_name}"
        cursor = connection.cursor()
        cursor.execute(query)
        values = [row[0] for row in cursor.fetchall()]
        cursor.close()
        connection.close()
        return values
    except Error as e:
        print(f"❌ Error getting distinct values: {e}")
        return []


if __name__ == "__main__":
    conn = get_db_connection()
    if conn:
        print("✅ Database connection successful!")
        df = get_financials()
        print(f"📊 Fetched {len(df)} rows")
        print(f"📊 Column dtypes:\n{df.dtypes}")
        years = get_distinct_values('source_year')
        print(f"📅 Years available: {years}")
        conn.close()
    else:
        print("❌ Failed to connect to database")
