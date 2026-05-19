"""
Multi-Agent AI Chat — LangGraph + Groq
Uses create_react_agent from langgraph.prebuilt (correct for LangChain 1.3+)
Tools use StructuredTool + Pydantic for clean Groq-compatible schema
"""
import os
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.tools import StructuredTool
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field

from agents.sql_tool import run_sql_tool
from agents.calculator_tool import run_calculator_tool
from agents.explainer_tool import run_explainer_tool

load_dotenv()

MAX_HISTORY_TURNS = 6

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a professional financial analyst AI assistant for OMOTEC,
an educational technology company based in India.

You have three tools:
- SQL_Database: Use FIRST for any question involving numbers, revenue, expenses, students, counts
- PnL_Calculator: Use for margin percentages, EBITDA %, PAT %, Gross Profit % calculations
- Financial_Explainer: Use for conceptual questions (what is EBITDA?) or as fallback

RULES:
1. Always try SQL_Database first for any numerical question
2. SQL queries already return values converted to Lakhs or Crores — do NOT convert again
3. If SQL returns 'revenue_lakhs: 1555.36' then the answer is ₹1,555.36 Lakhs — report directly
4. Use ₹ symbol for all monetary values and always state the unit (Lakhs or Crores)
5. Always mention which year and segment your answer refers to
6. source_year in the DB uses underscores: FY25_26 not FY25-26
7. Be concise, professional, and well formatted
8. If one tool returns no results, try another tool
9. Never make up numbers — only use what the tools return
"""

# ── Pydantic input schemas (required for Groq tool calling) ──────────────────

class SQLInput(BaseModel):
    question: str = Field(description="Clear financial question to query from the database")

class CalcInput(BaseModel):
    question: str = Field(description="Financial question or JSON filters for P&L calculation")

class ExplainInput(BaseModel):
    question: str = Field(description="Conceptual financial question to explain")

# ── Tool definitions ──────────────────────────────────────────────────────────

TOOLS = [
    StructuredTool(
        name="SQL_Database",
        func=run_sql_tool,
        args_schema=SQLInput,
        description=(
            "Query MySQL database for exact financial numbers. "
            "Use FIRST for any numerical question: revenue, expenses, "
            "students, schools, branches, monthly data, comparisons. "
            "Input: a clear question about financial data. "
            "Examples: 'Total revenue for centre in FY25_26 in Lakhs', "
            "'Monthly revenue for school segment FY24_25', "
            "'Which branch has highest revenue in FY25_26', "
            "'Total expense for school segment FY25_26 in Lakhs'"
        )
    ),
    StructuredTool(
        name="PnL_Calculator",
        func=run_calculator_tool,
        args_schema=CalcInput,
        description=(
            "Calculate P&L metrics: Gross Profit %, EBITDA %, PAT %, margins. "
            "Use when user asks about profit margins, EBITDA, PAT, "
            "or wants a full P&L breakdown for a segment or year. "
            "Input: plain text like 'P&L for centre FY25-26 in Lakhs' "
            "or JSON: '{\"source_year\": \"FY25-26\", \"segment\": \"centre\", \"unit\": \"Lakhs\"}'"
        )
    ),
    StructuredTool(
        name="Financial_Explainer",
        func=run_explainer_tool,
        args_schema=ExplainInput,
        description=(
            "Answer conceptual financial questions using the knowledge base. "
            "Use for: 'What is EBITDA?', 'Why is gross margin negative?', "
            "'Explain PAT margin', 'What does indirect expense include?'. "
            "Also use as FALLBACK if SQL_Database or PnL_Calculator return no results."
        )
    ),
]


# ── Main chat class ───────────────────────────────────────────────────────────

class FinancialAIChat:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")

        if not self.api_key or self.api_key == "your_groq_api_key_here":
            print("⚠️  Warning: GROQ_API_KEY not set in .env file")
            self.agent = None
        else:
            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                api_key=self.api_key,
                max_tokens=800,
            )

            self.agent = create_react_agent(
                model=llm,
                tools=TOOLS,
                prompt=SYSTEM_PROMPT,
            )

        print("✅ Multi-Agent AI Chat initialized (LangGraph)")

    def _build_messages(self, user_message: str, history: list[dict]) -> list:
        """Convert history dicts to LangChain message objects."""
        messages = []
        recent = history[-(MAX_HISTORY_TURNS * 2):]
        for msg in recent:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        messages.append(HumanMessage(content=user_message))
        return messages

    def chat(
        self,
        user_message: str,
        history: list[dict] | None = None,
        filters: dict | None = None
    ) -> dict:
        """
        Main entry point — called by app.py.
        API contract unchanged — frontend needs zero changes.
        """
        if not self.agent:
            return {
                "error": True,
                "message": "❌ Groq AI not configured. Set GROQ_API_KEY in backend/.env",
                "history": history or [],
            }

        if history is None:
            history = []

        try:
            # Enrich question with dashboard filter context
            enriched_question = user_message
            if filters:
                year    = filters.get("source_year") or filters.get("year")
                segment = filters.get("segment")
                unit    = filters.get("unit", "Lakhs")
                parts   = []
                if year    and year    != "All": parts.append(f"year={year}")
                if segment and segment != "All": parts.append(f"segment={segment}")
                if unit:                         parts.append(f"unit={unit}")
                if parts:
                    enriched_question = (
                        f"{user_message} "
                        f"[Dashboard context: {', '.join(parts)}]"
                    )

            # Build message list with history
            messages = self._build_messages(enriched_question, history)

            # Invoke the LangGraph agent
            result = self.agent.invoke(
                {"messages": messages},
                config={"recursion_limit": 8}
            )

            # Extract final answer from last AI message
            assistant_reply = ""
            for msg in reversed(result["messages"]):
                if isinstance(msg, AIMessage) and msg.content:
                    assistant_reply = msg.content
                    break

            if not assistant_reply:
                assistant_reply = (
                    "I could not generate a response. "
                    "Please try rephrasing your question."
                )

            # Update and trim history
            updated_history = list(history) + [
                {"role": "user",      "content": user_message},
                {"role": "assistant", "content": assistant_reply},
            ]
            max_msgs = MAX_HISTORY_TURNS * 2
            if len(updated_history) > max_msgs:
                updated_history = updated_history[-max_msgs:]

            return {
                "error": False,
                "message": assistant_reply,
                "history": updated_history,
                "rag_enabled": True,
                "documents_retrieved": 0,
                "relevance_scores": [],
            }

        except Exception as e:
            print(f"❌ Agent error: {e}")
            return {
                "error": True,
                "message": f"Sorry, I encountered an error: {str(e)}",
                "history": history,
            }


# Global instance used by app.py
ai_chat = FinancialAIChat()