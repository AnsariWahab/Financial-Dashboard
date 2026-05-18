"""
RAG-based AI Chat Service using Groq AI
Uses Retrieval-Augmented Generation for intelligent responses

How RAG Works:
1. INDEXING: Financial data is converted to embeddings and stored in vector DB
2. RETRIEVAL: When user asks question, semantically similar data is retrieved
3. GENERATION: Only relevant data is sent to Groq AI for response generation

Memory: Each request now accepts a `history` list of prior turns so the
model can reference earlier parts of the conversation.
"""

from groq import Groq
from rag_system import rag
import os
from dotenv import load_dotenv

load_dotenv()

# Maximum number of prior turns (user + assistant pairs) to keep in context.
# Older turns are dropped to avoid exceeding the model's token limit.
MAX_HISTORY_TURNS = 10


class FinancialAIChat:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")

        if not self.api_key or self.api_key == "your_groq_api_key_here":
            print("⚠️ Warning: GROQ_API_KEY not set in .env file")
            self.client = None
        else:
            self.client = Groq(api_key=self.api_key)

        print("✅ RAG-based AI Chat initialized")

    def retrieve_context(self, user_query: str, n_results: int = 3):
        """
        Retrieve relevant documents using semantic search
        and generate context from them.
        """
        try:
            retrieved_docs = rag.retrieve(user_query, n_results=n_results)

            if not retrieved_docs:
                return [], "No relevant financial data found."

            context = rag.generate_context(retrieved_docs)
            return retrieved_docs, context

        except Exception as e:
            print(f"❌ Error in RAG retrieval: {e}")
            return [], "Unable to retrieve financial data at this moment."

    def build_system_prompt(self, financial_context: str) -> str:
        """
        Build the system prompt, injecting the RAG context for this turn.
        The system prompt is always regenerated fresh per turn so the
        retrieved context is always relevant to the latest question.
        """
        return f"""
You are a professional financial analyst AI assistant for OMOTEC,
an educational technology company.

You have access to company financial data through a RAG
(Retrieval-Augmented Generation) system.

The following financial information was retrieved as the most relevant
context for the user's LATEST question:

================ FINANCIAL CONTEXT ================

{financial_context}

===================================================

IMPORTANT RULES:

1. Answer ONLY using the retrieved financial data above
2. Do NOT make up numbers or assumptions
3. If information is unavailable, clearly say:
   "No relevant data was found for this query."
4. Do NOT assume missing values are zero unless explicitly shown
5. Use exact financial figures from the retrieved context
6. Use ₹ symbol for monetary values
7. Mention "Lakhs INR" where applicable
8. Show percentages with ONE decimal place
9. Avoid repeatedly saying:
   - "According to Document X"
   - "Based on Document X"
10. Mention source documents ONLY if necessary
11. Keep responses:
   - professional
   - concise
   - well formatted
12. Prefer bullet points and structured formatting
13. For calculations, show step-by-step breakdown
14. Always provide a direct final answer

MEMORY RULES:
- You have access to the full conversation history below.
- Use earlier turns to resolve follow-up questions like
  "what about last year?" or "compare that to Research segment".
- Never repeat information the user already acknowledged.

RESPONSE FORMAT:

Answer:
<direct answer>

Breakdown:
- Item 1
- Item 2

Calculation:
<step-by-step calculation if applicable>

Conclusion:
<final concise result>
"""

    def _trim_history(self, history: list[dict]) -> list[dict]:
        """
        Keep only the most recent MAX_HISTORY_TURNS pairs so we don't
        blow past the model's context window.

        Each pair = one user message + one assistant message = 2 entries.
        """
        max_messages = MAX_HISTORY_TURNS * 2
        if len(history) > max_messages:
            # Always drop from the front (oldest messages)
            history = history[-max_messages:]
        return history

    def chat(self, user_message: str, history: list[dict] | None = None, filters=None) -> dict:
        """
        RAG-BASED CHAT WITH MEMORY

        Flow:
        1. Accept conversation history from the client
        2. Retrieve relevant RAG context for the latest question
        3. Build system prompt with that context
        4. Send [system] + trimmed history + [new user message] to Groq
        5. Return response + updated history for the client to store

        Args:
            user_message: The latest question from the user.
            history:      List of {"role": "user"|"assistant", "content": str}
                          representing prior turns. The client owns this state
                          and sends it back on every request.
            filters:      Optional dashboard filter dict (unused by Groq but
                          available for future tool-call integration).

        Returns:
            dict with keys:
              error              – bool
              message            – str  (the assistant's reply)
              history            – list (updated history to store client-side)
              rag_enabled        – bool
              documents_retrieved– int
              relevance_scores   – list[float]
        """
        if not self.client:
            return {
                "error": True,
                "message": (
                    "❌ Groq AI is not configured. "
                    "Please set GROQ_API_KEY in backend/.env file."
                ),
                "history": history or [],
            }

        if history is None:
            history = []

        try:
            # ── STEP 1: RAG retrieval for the latest question ──────────────
            retrieved_docs, financial_context = self.retrieve_context(
                user_message, n_results=3
            )

            # ── STEP 2: Build system prompt with fresh RAG context ─────────
            system_prompt = self.build_system_prompt(financial_context)

            # ── STEP 3: Trim history to avoid token overflow ───────────────
            trimmed_history = self._trim_history(list(history))

            # ── STEP 4: Assemble messages for Groq ────────────────────────
            #
            # Structure:
            #   [system prompt]          ← RAG context + rules (not in history)
            #   [prior turn 1 user]      ← from history
            #   [prior turn 1 assistant] ← from history
            #   ...
            #   [current user message]   ← the new question
            #
            messages_for_groq = (
                [{"role": "system", "content": system_prompt}]
                + trimmed_history
                + [{"role": "user", "content": user_message}]
            )

            # ── STEP 5: Call Groq ──────────────────────────────────────────
            chat_completion = self.client.chat.completions.create(
                messages=messages_for_groq,
                model="llama-3.3-70b-versatile",
                temperature=0.2,
                max_tokens=1000,
            )

            assistant_reply = chat_completion.choices[0].message.content

            # ── STEP 6: Append this turn to history and return ─────────────
            updated_history = trimmed_history + [
                {"role": "user",      "content": user_message},
                {"role": "assistant", "content": assistant_reply},
            ]

            return {
                "error": False,
                "message": assistant_reply,
                "history": updated_history,        # ← client stores this
                "rag_enabled": True,
                "documents_retrieved": len(retrieved_docs),
                "relevance_scores": [
                    round(doc.get("relevance_score", 0), 4)
                    for doc in retrieved_docs
                ],
            }

        except Exception as e:
            print(f"❌ Error in AI chat: {e}")
            return {
                "error": True,
                "message": f"Sorry, I encountered an error: {str(e)}",
                "history": history,   # return unchanged history on error
            }


# Global instance used by app.py
ai_chat = FinancialAIChat()