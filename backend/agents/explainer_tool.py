"""
Explainer Tool — wraps the existing RAG system.
Used for conceptual questions: "what is EBITDA", "why is gross margin negative" etc.
"""
from rag_system import rag


def run_explainer_tool(question: str) -> str:
    """
    Retrieves relevant RAG chunks and returns them as context.
    The orchestrator LLM will synthesize the final answer from this.
    """
    try:
        retrieved_docs = rag.retrieve(question, n_results=4)

        if not retrieved_docs:
            return "No relevant information found in the knowledge base."

        lines = []
        for doc in retrieved_docs:
            score = doc.get("relevance_score", 0)
            if score > 0.3:  # only include reasonably relevant docs
                lines.append(doc["content"])

        if not lines:
            return "No sufficiently relevant information found."

        return "Retrieved Financial Context:\n\n" + "\n\n---\n\n".join(lines)

    except Exception as e:
        print(f"❌ Explainer Tool error: {e}")
        return f"RAG retrieval failed: {str(e)}"