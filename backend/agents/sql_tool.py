"""
SQL Tool — converts natural language to MySQL query and runs it.
This is the most important tool — gives the agent real numbers from the DB.
"""
import os
import re
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from database import get_db_connection
from dotenv import load_dotenv

load_dotenv()

# ── Schema the LLM needs to know about ──────────────────────────────────────
DB_SCHEMA = """
TABLE: omotec_financials
COLUMNS:
  source_year     VARCHAR  — values: FY22_23, FY23_24, FY24_25, FY25_26  (underscores NOT hyphens)
  month           DATE     — last day of each month e.g. 2025-04-30
  segment         VARCHAR  — values: research, school, centre, indirect (empty string rows exist, exclude them)
  branch          VARCHAR  — values: Pune, Powai, Malad, Juhu, Laxmi, Delhi, Lokhandwala, SOBO, CNMS, GK Gurukul
                             NULL branch = research/school data (valid, do NOT exclude)
                             There are NO rows with branch = 'ALL'
  pnl_categories  VARCHAR  — values: Revenue, Direct Expense, Indirect Expense, Depreciation, Interest, Tax
  value           DECIMAL  — raw value in INR (NOT lakhs, NOT crores — raw rupees)
  Student_name    VARCHAR  — school/student name
  school_type     VARCHAR  — e.g. STEM LAB
  research_category VARCHAR — values: Research Paper, Research Competition

IMPORTANT RULES FOR QUERY GENERATION:
1. source_year uses UNDERSCORES: FY25_26 not FY25-26
2. To get Revenue: WHERE pnl_categories = 'Revenue'
3. To get Expenses: WHERE pnl_categories != 'Revenue'
4. To get Gross Profit: Revenue minus Direct Expense (use subqueries)
5. value column is in RAW RUPEES (individual rupees, not thousands or lakhs).
   ALWAYS convert in the SQL query itself using:
   - Lakhs:  ROUND(SUM(value) / 100000, 2) AS amount_lakhs
   - Crores: ROUND(SUM(value) / 10000000, 2) AS amount_crores
   NEVER return raw rupee values — always divide inside the SQL query.
   Example: SELECT ROUND(SUM(value) / 100000, 2) AS revenue_lakhs
   Default unit is Lakhs unless user specifies Crores.
6. Always use SUM(value) not just value
7. For branch filtering:
   - Company-wide totals: do NOT filter by branch at all
   - Specific branch: WHERE branch = 'BranchName'
   - NEVER use branch != 'ALL' — this breaks NULL branch rows
   - NULL branch rows are valid data, never exclude them
8. Segment filtering rules:
   - When filtering by a SPECIFIC segment: AND segment = 'centre' (or research/school)
   - For COMPANY-WIDE totals (revenue, expenses, P&L): do NOT filter segment at all
   - Empty string segment ('') rows contain company-level entries like Depreciation and Interest
   - NEVER add segment != '' for total/overall queries — it removes valid expense data
   - Only filter segment when the question specifically mentions a segment name
9. For month filtering use MONTH(month) or YEAR(month) functions
10. Always add LIMIT 100 for safety
11. Do NOT add any branch filter unless the question specifically asks about a branch
12. ALWAYS alias your result columns clearly:
    e.g. AS revenue_lakhs, AS total_expense_lakhs, AS gross_profit_lakhs
    This helps the agent understand what the number represents.
"""

SYSTEM_PROMPT = f"""You are a MySQL expert for a financial dashboard.
Given a user question, write ONE valid MySQL SELECT query to answer it.

{DB_SCHEMA}

RESPOND WITH ONLY THE SQL QUERY — no explanation, no markdown, no backticks.
If you cannot write a query for this question, respond with: CANNOT_QUERY
"""


def clean_sql(raw: str) -> str:
    """Strip markdown fences and whitespace from LLM output."""
    raw = raw.strip()
    raw = re.sub(r"```sql\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```\s*", "", raw)
    return raw.strip()


def is_safe_query(sql: str) -> bool:
    """Block any destructive SQL — agent only gets read access."""
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
    upper = sql.upper()
    return not any(word in upper for word in forbidden)


# One shared LLM instance for SQL generation (8B is fast enough for SQL)
_sql_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)


def run_sql_tool(question: str) -> str:
    """
    LangChain Tool function.
    1. Ask LLM to write a SQL query for the question
    2. Validate it is safe
    3. Run it against MySQL
    4. Return results as formatted string
    """
    try:
        # Step 1 — Generate SQL
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=question)
        ]
        response = _sql_llm.invoke(messages)
        raw_sql = response.content.strip()

        if "CANNOT_QUERY" in raw_sql:
            return "SQL_AGENT_CANNOT_ANSWER"

        sql = clean_sql(raw_sql)
        print(f"🔍 SQL Agent generated: {sql}")

        # Step 2 — Safety check
        if not is_safe_query(sql):
            return "SQL query was blocked for safety reasons."

        # Step 3 — Run query
        connection = get_db_connection()
        if connection is None:
            return "Database connection failed."

        cursor = connection.cursor(dictionary=True)
        cursor.execute(sql)
        rows = cursor.fetchall()
        cursor.close()
        connection.close()

        # Step 4 — Format results
        if not rows:
            return "Query returned no results. The data may not exist for the specified filters."

        # Format as readable table
        lines = []
        for row in rows[:20]:  # cap at 20 rows for context window
            formatted = ", ".join(
                f"{k}: {round(float(v), 2) if isinstance(v, (int, float)) else v}"
                for k, v in row.items()
                if v is not None
            )
            lines.append(formatted)

        result = f"SQL Query Results ({len(rows)} rows):\n" + "\n".join(lines)
        if len(rows) > 20:
            result += f"\n... and {len(rows) - 20} more rows"
        return result

    except Exception as e:
        print(f"❌ SQL Tool error: {e}")
        return f"SQL query failed: {str(e)}"