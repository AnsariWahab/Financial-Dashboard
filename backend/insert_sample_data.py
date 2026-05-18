"""
Insert sample data into the database
Run this after creating tables to populate your database
"""
from database import get_db_connection
from datetime import datetime, timedelta
import random

def insert_sample_data():
    """Insert sample financial data"""
    connection = get_db_connection()
    if not connection:
        print("❌ Could not connect to database")
        return
    
    cursor = connection.cursor()
    
    print("\n📊 Inserting sample data into database...")
    
    # 1. Insert Centres
    print("\n1️⃣ Inserting centres...")
    centres = [
        ('North Centre', 450000, 280000, 170000, 37.8),
        ('South Centre', 520000, 310000, 210000, 40.4),
        ('East Centre', 380000, 245000, 135000, 35.5),
        ('West Centre', 425000, 268000, 157000, 36.9),
        ('Central Hub', 312000, 195000, 117000, 37.5),
    ]
    
    for centre in centres:
        try:
            cursor.execute("""
            INSERT INTO centres (name, revenue, expenses, profit, profit_margin)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                revenue = VALUES(revenue),
                expenses = VALUES(expenses),
                profit = VALUES(profit),
                profit_margin = VALUES(profit_margin)
            """, centre)
            print(f"   ✅ Inserted: {centre[0]}")
        except Exception as e:
            print(f"   ⚠️  {centre[0]} might already exist")
    
    connection.commit()
    
    # 2. Insert Transactions
    print("\n2️⃣ Inserting transactions...")
    
    centre_names = [c[0] for c in centres]
    income_categories = ['Product Sales', 'Services', 'Subscriptions', 'Consulting', 'Other Income']
    expense_categories = ['Salaries & Wages', 'Rent & Utilities', 'Marketing', 'Technology', 'Operations', 'Other Expenses']
    
    # Generate transactions for last 12 months
    transactions_count = 0
    for month_offset in range(12):
        # Calculate date for this month
        base_date = datetime.now() - timedelta(days=30 * (11 - month_offset))
        
        # Generate income transactions (10-15 per month)
        for _ in range(random.randint(10, 15)):
            day = random.randint(1, 28)
            transaction_date = base_date.replace(day=day)
            category = random.choice(income_categories)
            amount = random.randint(5000, 50000)
            centre = random.choice(centre_names)
            description = f"{category} - {transaction_date.strftime('%B %Y')}"
            
            cursor.execute("""
            INSERT INTO transactions (date, description, category, amount, type, centre)
            VALUES (%s, %s, %s, %s, %s, %s)
            """, (transaction_date.date(), description, category, amount, 'income', centre))
            transactions_count += 1
        
        # Generate expense transactions (15-20 per month)
        for _ in range(random.randint(15, 20)):
            day = random.randint(1, 28)
            transaction_date = base_date.replace(day=day)
            category = random.choice(expense_categories)
            amount = -random.randint(2000, 20000)  # Negative for expenses
            centre = random.choice(centre_names)
            description = f"{category} - {transaction_date.strftime('%B %Y')}"
            
            cursor.execute("""
            INSERT INTO transactions (date, description, category, amount, type, centre)
            VALUES (%s, %s, %s, %s, %s, %s)
            """, (transaction_date.date(), description, category, abs(amount), 'expense', centre))
            transactions_count += 1
    
    connection.commit()
    print(f"   ✅ Inserted {transactions_count} transactions")
    
    # 3. Verify data
    print("\n3️⃣ Verifying data...")
    cursor.execute("SELECT COUNT(*) as count FROM centres")
    centre_count = cursor.fetchone()[0]
    print(f"   📊 Centres: {centre_count}")
    
    cursor.execute("SELECT COUNT(*) as count FROM transactions")
    transaction_count = cursor.fetchone()[0]
    print(f"   📊 Transactions: {transaction_count}")
    
    cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE type = 'income'")
    total_revenue = cursor.fetchone()[0]
    print(f"   💰 Total Revenue: ${total_revenue:,.2f}" if total_revenue else "   💰 Total Revenue: $0.00")
    
    cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'")
    total_expenses = cursor.fetchone()[0]
    print(f"   💵 Total Expenses: ${total_expenses:,.2f}" if total_expenses else "   💵 Total Expenses: $0.00")
    
    cursor.close()
    connection.close()
    
    print("\n✅ Sample data inserted successfully!")
    print("\nNext step:")
    print("Run: python app.py   (to start the API server)")

if __name__ == "__main__":
    print("=" * 60)
    print("📦 Inserting Sample Data")
    print("=" * 60)
    insert_sample_data()
