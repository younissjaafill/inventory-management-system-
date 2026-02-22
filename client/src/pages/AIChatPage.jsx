import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot, Send, User, Sparkles, Loader2, AlertTriangle, BarChart2,
  Tag, TrendingUp, ChevronRight, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'

// ── AI Feature panels ─────────────────────────────────────────────────────────

function RestockPanel({ api }) {
  const [loading,  setLoading]  = useState(false)
  const [results,  setResults]  = useState(null)

  const run = async () => {
    setLoading(true)
    try {
      const r = await api.post('/api/ai/restock-suggestions')
      setResults(r.data)
    } catch { toast.error('Failed to get suggestions') }
    finally { setLoading(false) }
  }

  const PRIORITY_COLOR = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <AlertTriangle size={15} className="text-yellow-500" /> Restock Suggestions
        </h3>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {results ? 'Refresh' : 'Analyze'}
        </button>
      </div>

      {results && (
        results.suggestions.length === 0
          ? <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">✓ All items are well stocked!</p>
          : <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.suggestions.map((s, i) => (
                <div key={i} className={`rounded-lg border p-2.5 ${PRIORITY_COLOR[s.priority] || 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate">{s.item_name}</p>
                      <p className="text-xs opacity-80 mt-0.5">{s.reason}</p>
                    </div>
                    <span className="text-xs font-bold whitespace-nowrap">+{s.suggested_quantity}</span>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}

function ClassifyPanel({ api }) {
  const [name,    setName]    = useState('')
  const [desc,    setDesc]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)

  const run = async () => {
    if (!name.trim()) return toast.error('Enter an item name')
    setLoading(true)
    try {
      const r = await api.post('/api/ai/classify', { name, description: desc })
      setResult(r.data)
    } catch { toast.error('Classification failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm mb-3">
        <Tag size={15} className="text-indigo-500" /> Auto-Classify Item
      </h3>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Item name..."
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Description (optional)..."
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />
      <button
        onClick={run}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 text-sm py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Classify
      </button>
      {result && (
        <div className="mt-3 bg-indigo-50 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-indigo-800">
            {result.category_name || 'Unknown category'}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              result.confidence === 'high' ? 'bg-green-100 text-green-700' :
              result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>{result.confidence}</span>
          </p>
          <p className="text-xs text-indigo-600">{result.reason}</p>
        </div>
      )}
    </div>
  )
}

function ForecastPanel({ api }) {
  const [loading,  setLoading]  = useState(false)
  const [forecasts, setForecasts] = useState(null)

  const run = async () => {
    setLoading(true)
    try {
      const r = await api.post('/api/ai/forecast')
      setForecasts(r.data.forecasts)
    } catch { toast.error('Forecast failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <TrendingUp size={15} className="text-green-500" /> Demand Forecast
        </h3>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <BarChart2 size={12} />}
          {forecasts ? 'Refresh' : 'Run Forecast'}
        </button>
      </div>
      {forecasts && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {forecasts.map((f, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              <p className="font-medium text-xs text-gray-800 truncate">{f.item_name}</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span>Stockout in: <strong className={f.estimated_days_until_stockout != null && f.estimated_days_until_stockout < 14 ? 'text-red-600' : 'text-gray-700'}>
                  {f.estimated_days_until_stockout != null ? `~${f.estimated_days_until_stockout}d` : 'N/A'}
                </strong></span>
                <span>Reorder: <strong className="text-gray-700">{f.recommended_reorder_quantity}</strong></span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{f.forecast_notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chat ──────────────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Which items are critically low?',
  'What should I reorder this week?',
  'Show me all electronics items',
  'How can I improve inventory accuracy?',
]

export default function AIChatPage() {
  const api      = useApi()
  const navigate = useNavigate()
  const [messages,  setMessages]  = useState([
    { role: 'assistant', content: 'Hello! I\'m your inventory assistant. Ask me anything about your stock levels, items, or get restocking advice.' }
  ])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await api.post('/api/ai/chat', { messages: next.map(m => ({ role: m.role, content: m.content })) })
      setMessages([...next, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages([...next, { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot size={24} className="text-indigo-500" /> AI Assistant
        </h1>
        <p className="text-sm text-gray-500">Inventory insights, restock suggestions, demand forecasting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat panel */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-gray-200 h-[calc(100vh-220px)] min-h-[480px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                }`}>
                  {msg.role === 'user'
                    ? <User size={14} className="text-white" />
                    : <Bot size={14} className="text-white" />
                  }
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-4 pt-2 flex gap-2 overflow-x-auto">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-40"
              >
                <ChevronRight size={11} /> {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about inventory, stock levels, reorder advice..."
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* AI tools panel */}
        <div className="space-y-4">
          <RestockPanel  api={api} />
          <ClassifyPanel api={api} />
          <ForecastPanel api={api} />
        </div>
      </div>
    </div>
  )
}
