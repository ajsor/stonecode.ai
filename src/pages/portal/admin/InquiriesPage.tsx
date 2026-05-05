import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import type { LandingConversation, LandingMessage, LandingLead } from '../../../types'

type Tab = 'conversations' | 'leads' | 'flagged'
type LeadStatus = 'new' | 'reviewed' | 'contacted' | 'closed'

interface MessageBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
}

function fmtDate(s: string): string {
  const d = new Date(s)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtCategory(c: string): string {
  return c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30',
  reviewed: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/20 border-sky-200 dark:border-sky-500/30',
  contacted: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30',
  closed: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/20 border-slate-200 dark:border-slate-500/30',
}

export default function InquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'conversations'
  const [tab, setTab] = useState<Tab>(initialTab)

  const [conversations, setConversations] = useState<LandingConversation[]>([])
  const [leads, setLeads] = useState<LandingLead[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedConvId, setSelectedConvId] = useState<string | null>(searchParams.get('conversation'))
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(searchParams.get('lead'))

  useEffect(() => {
    loadAll()
  }, [])

  // If the URL referenced a lead, jump to the leads tab
  useEffect(() => {
    if (selectedLeadId && tab !== 'leads') setTab('leads')
  }, [selectedLeadId])

  const loadAll = async () => {
    setLoading(true)
    const [cRes, lRes] = await Promise.all([
      supabase.from('landing_conversations').select('*').order('last_message_at', { ascending: false }).limit(200),
      supabase.from('landing_leads').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    if (cRes.data) setConversations(cRes.data as LandingConversation[])
    if (lRes.data) setLeads(lRes.data as LandingLead[])
    setLoading(false)
  }

  const flaggedConvs = useMemo(
    () => conversations.filter((c) => (c.flag_categories?.length ?? 0) > 0),
    [conversations],
  )

  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      onClick={() => {
        setTab(t)
        const next = new URLSearchParams(searchParams)
        next.set('tab', t)
        setSearchParams(next, { replace: true })
      }}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t
          ? 'bg-orange-500 text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full ${
          tab === t ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'
        }`}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
          Inquiries
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Conversations from Agent Stone on the landing page, captured leads, and flagged sessions for guardrail review.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
        {tabBtn('conversations', 'Conversations', conversations.length)}
        {tabBtn('leads', 'Leads', leads.length)}
        {tabBtn('flagged', 'Flagged', flaggedConvs.length)}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={loadAll}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'leads' ? (
        <LeadsTab leads={leads} selectedLeadId={selectedLeadId} setSelectedLeadId={setSelectedLeadId} reload={loadAll} />
      ) : (
        <ConversationsTab
          rows={tab === 'flagged' ? flaggedConvs : conversations}
          selectedId={selectedConvId}
          setSelectedId={setSelectedConvId}
          reload={loadAll}
          flaggedOnly={tab === 'flagged'}
        />
      )}
    </div>
  )
}

// ---------- Conversations / Flagged ----------

interface ConversationsTabProps {
  rows: LandingConversation[]
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  reload: () => void
  flaggedOnly: boolean
}

function ConversationsTab({ rows, selectedId, setSelectedId, reload, flaggedOnly }: ConversationsTabProps) {
  const selected = rows.find((r) => r.id === selectedId) ?? null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[70vh] overflow-y-auto">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400 text-center">
            {flaggedOnly ? 'No flagged conversations.' : 'No conversations yet.'}
          </div>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-white/5 transition-colors ${
                    selectedId === r.id ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {r.session_id.slice(0, 8)}…
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                      {fmtDate(r.last_message_at)}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{r.message_count} msg{r.message_count === 1 ? '' : 's'}</span>
                    {r.ip_address && <span className="truncate">· {r.ip_address}</span>}
                  </div>
                  {(r.flag_categories?.length ?? 0) > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.flag_categories.map((c) => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {fmtCategory(c)}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.reviewed && (
                    <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Reviewed
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {selected ? (
          <ConversationDetail conversation={selected} onChange={reload} />
        ) : (
          <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Select a conversation to view the transcript.
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationDetail({ conversation, onChange }: { conversation: LandingConversation; onChange: () => void }) {
  const [messages, setMessages] = useState<LandingMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const [adminNotes, setAdminNotes] = useState(conversation.admin_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [reviewed, setReviewed] = useState(conversation.reviewed)

  useEffect(() => {
    setAdminNotes(conversation.admin_notes ?? '')
    setReviewed(conversation.reviewed)
    loadMessages()
  }, [conversation.id])

  const loadMessages = async () => {
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('landing_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    if (data) setMessages(data as LandingMessage[])
    setLoadingMsgs(false)
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await supabase
      .from('landing_conversations')
      .update({ admin_notes: adminNotes, reviewed })
      .eq('id', conversation.id)
    setSavingNotes(false)
    onChange()
  }

  return (
    <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">{conversation.session_id}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Started {fmtDate(conversation.started_at)} · {conversation.message_count} message{conversation.message_count === 1 ? '' : 's'} · {conversation.total_tokens} tokens
            </div>
            {conversation.user_agent && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{conversation.user_agent}</div>
            )}
          </div>
          {conversation.ended_reason && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
              {fmtCategory(conversation.ended_reason)}
            </span>
          )}
        </div>
        {(conversation.flag_categories?.length ?? 0) > 0 && (
          <div className="mt-2.5">
            <div className="flex flex-wrap gap-1.5">
              {conversation.flag_categories.map((c) => (
                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {fmtCategory(c)}
                </span>
              ))}
            </div>
            {conversation.flag_notes && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">{conversation.flag_notes}</p>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/40">
        {loadingMsgs ? (
          <div className="text-center py-6 text-xs text-slate-500">Loading transcript…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">No messages.</div>
        ) : (
          messages.map((m) => <TranscriptRow key={m.id} message={m} />)
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-200 dark:border-white/10 space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="rounded"
          />
          Reviewed
        </label>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Admin notes <span className="text-slate-400">(use this to capture guardrail learnings)</span>
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="What did this conversation reveal? Should the system prompt change?"
            className="w-full text-sm rounded-lg px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40"
          />
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={saveNotes} loading={savingNotes}>Save</Button>
        </div>
      </div>
    </div>
  )
}

function TranscriptRow({ message }: { message: LandingMessage }) {
  const blocks = (Array.isArray(message.content) ? message.content : []) as MessageBlock[]

  if (message.role === 'user') {
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n\n')
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl text-sm bg-orange-500 text-white whitespace-pre-wrap">{text}</div>
      </div>
    )
  }

  if (message.role === 'tool') {
    return (
      <div className="text-[11px] text-slate-500 dark:text-slate-400 italic px-2">
        {blocks.map((b, i) => (
          <div key={i} className={b.is_error ? 'text-red-500' : ''}>
            ↳ tool_result: {b.content}
          </div>
        ))}
      </div>
    )
  }

  // assistant
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        {blocks.map((b, i) => {
          if (b.type === 'text') {
            return (
              <div key={i} className="px-3 py-2 rounded-2xl text-sm bg-white dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/5 whitespace-pre-wrap">
                {b.text}
              </div>
            )
          }
          if (b.type === 'tool_use') {
            return (
              <div key={i} className="px-3 py-2 rounded-lg text-[11px] font-mono bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                <div className="font-semibold mb-0.5">→ {b.name}</div>
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(b.input, null, 2)}</pre>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

// ---------- Leads ----------

interface LeadsTabProps {
  leads: LandingLead[]
  selectedLeadId: string | null
  setSelectedLeadId: (id: string | null) => void
  reload: () => void
}

function LeadsTab({ leads, selectedLeadId, setSelectedLeadId, reload }: LeadsTabProps) {
  const selected = leads.find((l) => l.id === selectedLeadId) ?? null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[70vh] overflow-y-auto">
        {leads.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400 text-center">No leads yet.</div>
        ) : (
          <ul>
            {leads.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setSelectedLeadId(l.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-white/5 transition-colors ${
                    selectedLeadId === l.id ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {l.name ?? l.email ?? 'Anonymous'}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[l.status]}`}>
                      {l.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {l.email} {l.interest && `· ${l.interest}`}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate(l.created_at)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LeadDetail lead={selected} reload={reload} />
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Select a lead to view details.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function LeadDetail({ lead, reload }: { lead: LandingLead; reload: () => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.admin_notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(lead.status)
    setNotes(lead.admin_notes ?? '')
  }, [lead.id])

  const save = async () => {
    setSaving(true)
    await supabase.from('landing_leads').update({ status, admin_notes: notes }).eq('id', lead.id)
    setSaving(false)
    reload()
  }

  return (
    <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{lead.name ?? '—'}</div>
            <a href={`mailto:${lead.email}`} className="text-sm text-orange-600 dark:text-orange-400 hover:underline">{lead.email}</a>
            {lead.phone && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lead.phone}</div>}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right shrink-0">
            <div>{fmtDate(lead.created_at)}</div>
            {lead.interest && <div className="capitalize mt-0.5">{lead.interest}</div>}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Synopsis</div>
          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{lead.synopsis}</p>
        </div>
        {lead.contact_preference && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Contact preference</div>
            <p className="text-sm text-slate-700 dark:text-slate-200">{lead.contact_preference}</p>
          </div>
        )}
        {lead.conversation_id && (
          <a
            href={`/portal/admin/inquiries?tab=conversations&conversation=${lead.conversation_id}`}
            className="inline-block text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            View full transcript →
          </a>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-200 dark:border-white/10 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Status</label>
          <div className="flex flex-wrap gap-2">
            {(['new', 'reviewed', 'contacted', 'closed'] as LeadStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  status === s ? STATUS_COLORS[s] : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Admin notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full text-sm rounded-lg px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40"
          />
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={save} loading={saving}>Save</Button>
        </div>
      </div>
    </div>
  )
}
