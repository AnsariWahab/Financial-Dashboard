import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single message shown in the chat UI */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * A history entry sent to / received from the backend.
 * Matches exactly what Groq expects: role + content only.
 * The system prompt is NOT included here — the backend adds it each turn.
 */
interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "👋 Hello! I'm your OMOTEC financial AI assistant with real-time access " +
    "to your database. I can analyze your financial performance, compare " +
    "segments, and answer questions about revenue, expenses, profitability, " +
    "and operational metrics.\n\nI also remember what we've discussed — so " +
    "feel free to ask follow-up questions like \"what about last year?\" or " +
    "\"break that down by segment\".",
};

// ── Component ──────────────────────────────────────────────────────────────────

export const AIChat = () => {
  // UI messages (includes the welcome message shown in the chat bubble)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);

  /**
   * Conversation history sent to the backend.
   * Does NOT include the welcome message — that's UI-only.
   * The backend appends each new turn and returns the updated list.
   */
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Scroll to latest message ─────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Clear / reset conversation ───────────────────────────────────────────

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    setHistory([]);
  };

  // ── Send a message ───────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = input.trim();
    if (!userText || isLoading) return;

    // 1. Optimistically add the user bubble
    const userMessage: ChatMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. POST message + full history to backend
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history,          // ← send the current history
        }),
      });

      const data = await response.json();

      // 3. Show the assistant's reply
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.error ? `❌ ${data.message}` : data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 4. Store the updated history returned by the backend.
      //    The backend already appended this turn, so we just overwrite.
      if (!data.error && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            "❌ Sorry, I couldn't connect to the AI service. " +
            'Please make sure the backend is running.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const turnCount = Math.floor(history.length / 2);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">

      {/* ── Header ── */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-white" />
          <h2 className="text-lg font-semibold text-white">AI Financial Assistant</h2>

          {/* Memory indicator — only shown after the first real exchange */}
          {turnCount > 0 && (
            <span className="ml-auto text-xs text-blue-200 bg-blue-800/40 px-2 py-0.5 rounded-full">
              {turnCount} turn{turnCount !== 1 ? 's' : ''} remembered
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-blue-100">Ask me anything about your financial data</p>
          {turnCount > 0 && (
            <button
              onClick={handleClear}
              title="Clear conversation"
              className="text-blue-200 hover:text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* ── Typing indicator ── */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              turnCount > 0
                ? 'Ask a follow-up or a new question…'
                : 'Ask about your financial data…'
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};