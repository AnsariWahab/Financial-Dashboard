# Financial Dashboard - Python Backend API

## 🐍 What This Is

This is the **Python backend server** that connects your MySQL database to the React frontend.

## 📦 Files in This Folder

- **app.py** - Main API server (FastAPI)
- **database.py** - Database connection to MySQL
- **create_tables.py** - Creates database tables
- **insert_sample_data.py** - Adds sample data
- **requirements.txt** - Python dependencies
- **.env** - Your database credentials (DO NOT SHARE!)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Create Database Tables
```bash
python create_tables.py
```

### 3. Add Sample Data (Optional)
```bash
python insert_sample_data.py
```

### 4. Start API Server
```bash
python app.py
```

Server runs at: **http://localhost:8000**

---

## 🔌 Your Database Connection

The API connects to your MySQL database using these credentials (in `.env`):

```
Host: 127.0.0.1
User: root
Password: Sasuke_1234
Database: omotec_dashboard
Port: 3306
```

---

## 📊 API Endpoints

Once running, these endpoints are available:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Health check |
| `GET /api/monthly-data` | Monthly financial data (12 months) |
| `GET /api/centre-data` | All business centres performance |
| `GET /api/transactions` | Recent transactions |
| `GET /api/expense-categories` | Expense breakdown by category |
| `GET /api/revenue-categories` | Revenue breakdown by source |
| `GET /api/key-metrics` | Key performance indicators |

### Test Endpoints

Open in browser:
- http://localhost:8000 - API status
- http://localhost:8000/docs - Interactive API documentation
- http://localhost:8000/api/monthly-data - Get monthly data

---

## 🗄️ Database Tables

### `transactions` Table
```sql
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    description VARCHAR(255),
    category VARCHAR(100),
    amount DECIMAL(12, 2),
    type ENUM('income', 'expense'),
    centre VARCHAR(100)
);
```

### `centres` Table
```sql
CREATE TABLE centres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    revenue DECIMAL(12, 2),
    expenses DECIMAL(12, 2),
    profit DECIMAL(12, 2),
    profit_margin DECIMAL(5, 2)
);
```

---

## 🔧 Common Commands

### Test Database Connection
```bash
python database.py
```

### View Tables
```bash
mysql -u root -p
USE omotec_dashboard;
SHOW TABLES;
```

### Check Data
```sql
-- See centres
SELECT * FROM centres;

-- See transactions
SELECT * FROM transactions LIMIT 10;

-- Total revenue
SELECT SUM(amount) FROM transactions WHERE type = 'income';
```

---

## 🛠️ Troubleshooting

### Cannot Connect to Database
1. Make sure MySQL is running
2. Check credentials in `.env`
3. Test connection: `python database.py`

### Port 8000 Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID [PID] /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

### Module Not Found
```bash
pip install -r requirements.txt
```

---

## 📝 How to Add Your Data

### Option 1: Add Manually via SQL
```sql
INSERT INTO transactions (date, description, category, amount, type, centre)
VALUES ('2024-12-20', 'Product Sale', 'Revenue', 10000, 'income', 'North Centre');
```

### Option 2: Import CSV
Create a Python script to import from CSV files.

### Option 3: Use the API
Send POST requests to add data (you can add POST endpoints).

---

## 🔐 Security Notes

- **.env file** contains your database password - DO NOT commit to Git
- For production, use environment variables
- Add authentication for POST/PUT/DELETE endpoints
- Use HTTPS in production

---

## 📚 Technologies Used

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **MySQL Connector** - Database driver
- **python-dotenv** - Environment variables
- **Pydantic** - Data validation

---

## 🎯 Next Steps

1. Verify tables are created
2. Insert your actual data
3. Test all API endpoints
4. Connect React frontend
5. Customize queries for your needs

---

**Your backend is ready to serve data to the frontend!** 🚀
