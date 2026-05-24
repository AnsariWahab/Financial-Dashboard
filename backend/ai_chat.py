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

SYSTEM_PROMPT = """You are a professional financial analyst AI assistant for a financial dashboard.

You have three tools:
- SQL_Database: For single specific metrics only — total revenue, expense totals, student counts, branch comparisons, monthly data
- PnL_Calculator: For ANY full P&L request or margin calculations — gross profit %, EBITDA %, PAT %, full breakdown
- Financial_Explainer: For conceptual questions (what is EBITDA?) or as last fallback

ROUTING RULES — follow exactly in order:
1. User asks for 'P&L breakdown', 'full P&L', 'gross profit %', 'EBITDA', 'EBITDA %', 'PAT', 'PAT %', 'margins' → PnL_Calculator FIRST, skip SQL entirely
2. User asks for a single number like 'total revenue', 'how many students', 'which branch has most revenue' → SQL_Database
3. User asks 'what is X' or 'explain X' or asks a conceptual question → Financial_Explainer
4. If a tool returns no results → try Financial_Explainer as fallback

CRITICAL RULES:
- PnL_Calculator input MUST be ONE combined string: 'Full P&L or PNL for centre segment FY25-26 in Lakhs'
  NEVER pass separate keys like source_year, segment, unit — it will fail with an error and For Individual Segments not for Overall, only give the PNL or P&L till the Gross margin line, not the full breakdown.
- SQL results are already converted to Lakhs or Crores — do NOT convert again
- Use ₹ symbol for all monetary values, always state the unit (Lakhs or Crores)
- Always mention which year and segment your answer refers to
- source_year in DB uses underscores: FY25_26 not FY25-26
- Never make up numbers — only use what tools return
- For short follow-up questions, use the same year and unit as the previous question
- Never add filters not explicitly mentioned in the question
- When comparing segments, query each one separately
- For conceptual questions (what is X, explain X, why does X matter),
  call Financial_Explainer immediately with just the concept name.
  Do not call SQL_Database first. Do not think too long.
  Example input to Financial_Explainer: 'EBITDA definition and importance'
- Never repeat information already given in the conversation history
- Each answer should only address the current question, not re-explain previous answers
- If the previous answer already explained a concept, do not explain it again
- You MUST always call at least one tool before giving a Final Answer
- For 'what is X' questions, ALWAYS call Financial_Explainer — never answer from memory
- Never say 'I don't have information' without first trying Financial_Explainer  
"""

# ── Pydantic input schemas (required for Groq tool calling) ──────────────────

class SQLInput(BaseModel):
    question: str = Field(description="Clear financial question to query from the database")

class CalcInput(BaseModel):
    question: str = Field(
        description=(
            "Financial question or filter string for P&L calculation. "
            "Pass as plain text like: 'P&L for centre segment FY25-26 in Lakhs' "
            "Do NOT pass as separate JSON keys — combine into one string."
        )
    )

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
            "Calculate P&L metrics: Gross Profit %, EBITDA %, PAT %, full P&L breakdown. "
            "Use when user asks for margins, EBITDA, PAT, or full P&L for a segment/year. "
            "IMPORTANT: Pass everything as ONE question string. "
            "Examples: "
            "'Full P&L for centre segment FY25-26 in Lakhs', "
            "'EBITDA margin for school FY25-26', "
            "'PAT % for research segment FY24-25'. "
            "Never pass source_year/segment/unit as separate parameters."
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
                model="llama-3.3-70b-versatile",  # more powerful model for orchestration
                temperature=0.1,
                api_key=self.api_key,
                max_tokens=800,
            )
            print(f"🤖 Orchestrator model: llama-3.3-70b-versatile")

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
                config={"recursion_limit": 20}
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