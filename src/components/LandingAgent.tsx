import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SESSION_KEY = 'agent-stone-session-id'
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/landing-agent`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

const GREETING: Msg = {
  role: 'assistant',
  text: "Hey, I'm Andrew. What brings you to stonecode.ai today?",
}

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

// Web Speech API — feature-detected at runtime; missing in Firefox
interface SpeechAlternative { transcript: string }
interface SpeechResult extends ArrayLike<SpeechAlternative> { isFinal: boolean }
interface SpeechResultEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface SpeechErrorEvent { error?: string }

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechCtor = new () => SpeechRecognitionInstance

function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface Props {
  darkMode: boolean
}

export function LandingAgent({ darkMode }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  // Snapshot of input at the moment recognition started, so interim results
  // append to (rather than overwrite) text the user already typed.
  const baseInputRef = useRef('')

  const speechSupported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // Stop listening if the panel closes
  useEffect(() => {
    if (!open && recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }
  }, [open])

  const toggleListening = () => {
    if (sending || ended) return
    if (listening) {
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      return
    }
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError('Voice input is not supported in this browser. Try Chrome, Edge, or Safari.')
      return
    }
    setError(null)
    const recog = new Ctor()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = navigator.language || 'en-US'
    baseInputRef.current = input.length > 0 ? input.trimEnd() + ' ' : ''

    recog.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const alt = event.results[i][0]
        if (event.results[i].isFinal) finalText += alt.transcript
        else interimText += alt.transcript
      }
      // Persist final segments into the base so subsequent interim results
      // don't blow them away
      if (finalText) baseInputRef.current = (baseInputRef.current + finalText).replace(/\s+/g, ' ')
      const next = (baseInputRef.current + interimText).slice(0, 800)
      setInput(next)
    }
    recog.onerror = (e) => {
      const code = e.error ?? 'unknown'
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone access blocked. Allow it in your browser settings to use voice.')
      } else if (code === 'no-speech') {
        // Quietly stop — user hit mic but didn't speak
      } else if (code !== 'aborted') {
        setError(`Voice input error: ${code}`)
      }
    }
    recog.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recog
    try {
      recog.start()
      setListening(true)
    } catch {
      setError('Could not start voice input. Try again.')
    }
  }

  const send = async () => {
    if (listening) {
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
    }
    const text = input.trim()
    if (!text || sending || ended) return
    setError(null)
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setSending(true)
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          session_id: getOrCreateSessionId(),
          message: text,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong.')
        return
      }
      setMessages((m) => [...m, { role: 'assistant', text: data.reply ?? '' }])
      if (data.ended) setEnded(true)
    } catch {
      setError('Network error. Try again in a moment.')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Trigger pill — fixed top-left */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className={`fixed top-4 left-4 sm:top-6 sm:left-6 z-40 group relative px-4 py-2.5 rounded-full backdrop-blur-xl border text-sm font-medium transition-colors ${
          darkMode
            ? 'bg-white/5 border-orange-500/20 text-slate-200 hover:bg-white/10 hover:border-orange-500/40'
            : 'bg-white/70 border-orange-400/30 text-slate-800 hover:bg-white hover:border-orange-500/50'
        }`}
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        aria-label={open ? 'Close Agent Stone' : 'Open Agent Stone'}
      >
        {/* Pulsing glow ring */}
        <motion.span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: darkMode
              ? '0 0 0 0 rgba(251, 146, 60, 0.5)'
              : '0 0 0 0 rgba(234, 88, 12, 0.45)',
          }}
          animate={{
            boxShadow: darkMode
              ? [
                  '0 0 0 0 rgba(251, 146, 60, 0.5)',
                  '0 0 0 10px rgba(251, 146, 60, 0)',
                  '0 0 0 0 rgba(251, 146, 60, 0)',
                ]
              : [
                  '0 0 0 0 rgba(234, 88, 12, 0.45)',
                  '0 0 0 10px rgba(234, 88, 12, 0)',
                  '0 0 0 0 rgba(234, 88, 12, 0)',
                ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
        <span className="relative z-10 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${darkMode ? 'bg-orange-400' : 'bg-orange-500'}`}
            style={{ boxShadow: darkMode ? '0 0 10px rgba(251,146,60,0.8)' : '0 0 8px rgba(234,88,12,0.6)' }}
          />
          {open ? 'Close' : 'Talk to Stone'}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="agent-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed top-20 left-4 sm:top-24 sm:left-6 z-40 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl backdrop-blur-2xl border shadow-2xl overflow-hidden ${
              darkMode
                ? 'bg-slate-950/85 border-orange-500/15'
                : 'bg-white/90 border-orange-400/25'
            }`}
            style={{ height: 'min(560px, calc(100vh - 8rem))' }}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center gap-3 ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2"
                  style={{ boxShadow: darkMode ? '0 0 0 2px #020617' : '0 0 0 2px #fff' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                  Agent Stone
                </div>
                <div className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Andrew's conversational guide
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? darkMode
                          ? 'bg-orange-500/15 text-orange-50 border border-orange-500/20'
                          : 'bg-orange-500 text-white'
                        : darkMode
                        ? 'bg-white/5 text-slate-100 border border-white/5'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl ${
                      darkMode ? 'bg-white/5 border border-white/5' : 'bg-slate-100'
                    }`}
                  >
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-slate-400' : 'bg-slate-500'}`}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className={`border-t px-3 py-3 ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
              {ended ? (
                <div className={`text-xs text-center py-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Conversation ended. Refresh to start a new one.
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 800))}
                    onKeyDown={handleKey}
                    rows={1}
                    placeholder={listening ? 'Listening…' : "Ask anything about Andrew's work…"}
                    className={`flex-1 resize-none rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      darkMode
                        ? 'bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:ring-orange-500/40 focus:border-orange-500/40'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-orange-500/40 focus:border-orange-500/50'
                    }`}
                    style={{ maxHeight: 120 }}
                    disabled={sending}
                  />
                  {speechSupported && (
                    <button
                      onClick={toggleListening}
                      disabled={sending}
                      className={`relative p-2.5 rounded-xl border transition-colors disabled:opacity-40 ${
                        listening
                          ? 'bg-red-500 border-red-500 text-white'
                          : darkMode
                          ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      aria-label={listening ? 'Stop listening' : 'Start voice input'}
                      aria-pressed={listening}
                    >
                      {listening && (
                        <motion.span
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0.6)', '0 0 0 8px rgba(239,68,68,0)'] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                      <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={send}
                    disabled={sending || !input.trim()}
                    className="p-2.5 rounded-xl text-white transition-opacity disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
                    aria-label="Send"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              )}
              <div className={`mt-2 text-[10px] text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Demo · Powered by Claude · {speechSupported ? 'Voice + text' : 'Text only'} · Conversations are stored
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
