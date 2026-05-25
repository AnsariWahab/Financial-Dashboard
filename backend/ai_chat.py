"""
Multi-Agent AI Chat — LangGraph + OpenRouter
Uses create_react_agent from langgraph.prebuilt (correct for LangChain 1.3+)
Tools use StructuredTool + Pydantic for clean schema
"""
import os
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.tools import StructuredTool
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field

from agents.sql_tool import run_sql_tool
from agents.calculator_tool import run_calculator_tool
from agents.explainer_tool import run_explainer_tool
from rag_system import rag

load_dotenv()

MAX_HISTORY_TURNS = 6

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a financial analyst AI for a dashboard.

Tools:
- SQL_Database: single metrics (revenue, counts, branch data, monthly)
- PnL_Calculator: margins (GP%, EBITDA%, PAT%) and full P&L breakdown
- Financial_Explainer: conceptual questions (what is EBITDA?)

Routing:
- P&L, PNL, margins, GP%, EBITDA%, PAT% → PnL_Calculator
- single number (revenue, students, branches) → SQL_Database
- "what is", "explain" → Financial_Explainer
- tool returns nothing → fallback to Financial_Explainer

Rules:
- PnL_Calculator input: ONE combined string like 'Full P&L for centre FY25-26 in Lakhs'
- NEVER pass source_year/segment/unit as separate params
- Segment P&L = only up to Gross Margin line. Company-wide = full P&L
- SQL results already in Lakhs/Crores — do NOT convert again
- Use ₹ symbol, mention unit (Lakhs/Crores), mention year and segment
- source_year in DB: FY25_26 (underscore)
- Never make up numbers — only use tool output
- For follow-ups, reuse previous year/unit
- Compare segments by querying each separately
- Always call a tool before answering. Never answer from memory.
- Never repeat info already in conversation history
- Keep answers concise — just the facts.
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
        self.api_key = os.getenv("OPENROUTER_API_KEY")

        if not self.api_key or self.api_key == "sk-or-v1-your_openrouter_key_here":
            print("⚠️  Warning: OPENROUTER_API_KEY not set in .env file")
            self.agent = None
        else:
            llm = ChatOpenAI(
                model="google/gemini-2.0-flash-001",
                temperature=0.1,
                api_key=self.api_key,
                max_tokens=400,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Omotec Financial Dashboard",
                },
            )
            print(f"🤖 Orchestrator: google/gemini-2.0-flash-001 (via OpenRouter)")

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
                "message": "❌ AI not configured. Set OPENROUTER_API_KEY in backend/.env",
                "history": history or [],
            }

        if history is None:
            history = []

        try:
            # ── Q&A Memory: retrieve similar past Q&As ──
            qa_context = ""
            try:
                past_qas = rag.retrieve_qa(user_message, n_results=3)
                if past_qas:
                    qa_lines = []
                    for qa in past_qas:
                        if qa["relevance_score"] > 0.3:
                            qa_lines.append(qa["content"])
                    if qa_lines:
                        qa_context = "Relevant past conversations:\n" + "\n".join(qa_lines) + "\n\n"
            except Exception as e:
                print(f"⚠️  Q&A retrieval error (non-fatal): {e}")

            # Enrich question with dashboard filter context + Q&A memory
            enriched_question = user_message
            context_parts = []
            if qa_context:
                context_parts.append(qa_context)
            if filters:
                year    = filters.get("source_year") or filters.get("year")
                segment = filters.get("segment")
                unit    = filters.get("unit", "Lakhs")
                parts   = []
                if year    and year    != "All": parts.append(f"year={year}")
                if segment and segment != "All": parts.append(f"segment={segment}")
                if unit:                         parts.append(f"unit={unit}")
                if parts:
                    context_parts.append(f"[Dashboard context: {', '.join(parts)}]")
            if context_parts:
                enriched_question = "\n".join(context_parts) + "\n\n" + user_message

            # Build message list with history
            messages = self._build_messages(enriched_question, history)

            # Invoke the LangGraph agent
            result = self.agent.invoke(
                {"messages": messages},
                config={"recursion_limit": 12}
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

            # ── Q&A Memory: store this exchange ──
            try:
                rag.store_qa(user_message, assistant_reply)
            except Exception as e:
                print(f"⚠️  Failed to store Q&A (non-fatal): {e}")

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
                "documents_retrieved": len(past_qas) if qa_context else 0,
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