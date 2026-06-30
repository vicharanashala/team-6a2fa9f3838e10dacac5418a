import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, Clock, Lock, Search, PlusCircle, Send, ArrowLeft, X,
  Star, CheckCircle2,AlarmClockOff , Image as ImageIcon, BookOpen
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const LOCK_SECONDS = 3 * 60 * 60

function formatTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerTone(secs) {
  const pct = secs / LOCK_SECONDS
  if (pct > 0.5) return { text: 'text-emerald-400', bar: 'bg-emerald-500' }
  if (pct > 0.2) return { text: 'text-amber-400', bar: 'bg-amber-500' }
  return { text: 'text-rose-400', bar: 'bg-rose-500' }
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ── Timer ───────────────────────────────────────────────────────────────
function TimerBar({ secsLeft }) {
  const pct = Math.max(0, Math.round((secsLeft / LOCK_SECONDS) * 100))
  const tone = timerTone(secsLeft)
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1.5 mb-1.5">
        <Clock size={13} className="text-slate-500" />
        <span className={`text-sm font-mono font-medium ${tone.text}`}>{formatTime(secsLeft)}</span>
      </div>
      <div className="w-36 h-1 bg-dark-600 rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${tone.bar}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  )
}

// ── Claimed question card ──────────────────────────────────────────────
function QuestionCard({ question }) {
  return (
    <div className="card-dark p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {getInitials(question.askerName)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">{question.askerName}</p>
          <p className="text-xs text-slate-600">
            {question.stepLabel} · {new Date(question.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
          <Lock size={10} /> locked by you
        </span>
      </div>
      <p className="text-slate-200 text-sm leading-relaxed mb-3">{question.text}</p>
      {question.images && question.images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {question.images.map((img, idx) => (
            <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="relative group overflow-hidden rounded-xl border border-dark-500 bg-dark-800 hover:border-blue-500/30 transition-all max-w-[200px]" title="View full image">
              <img src={img} alt={`Question screenshot ${idx + 1}`} className="max-h-28 object-contain p-1 group-hover:scale-102 transition-transform" />
            </a>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {(question.tags || []).map(t => (
          <span key={t} className="text-xs text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">{t}</span>
        ))}
      </div>
    </div>
  )
}

// ── Type select ─────────────────────────────────────────────────────────
function TypeSelect({ onSelect }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">How will you answer this?</p>
      <div className="space-y-2.5">
        <button onClick={() => onSelect('find')}
          className="w-full text-left p-4 rounded-2xl border border-dark-500/50 bg-dark-700 hover:border-blue-500/30 hover:bg-dark-600/50 transition-all flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Search size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200 mb-0.5">Find FAQ</p>
            <p className="text-xs text-slate-500 leading-relaxed">An existing FAQ entry already covers this. Point the asker to it.</p>
          </div>
        </button>
        <button onClick={() => onSelect('create')}
          className="w-full text-left p-4 rounded-2xl border border-dark-500/50 bg-dark-700 hover:border-emerald-500/30 hover:bg-dark-600/50 transition-all flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <PlusCircle size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200 mb-0.5">Create FAQ</p>
            <p className="text-xs text-slate-500 leading-relaxed">No entry covers this yet. Propose one — it'll go to admin review.</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Find FAQ ────────────────────────────────────────────────────────────
function FindFAQ({ onSubmit, submitting }) {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    api.get('/faq', { params: { limit: 200 } })
      .then(res => setFaqs(res.data.faqs || res.data || []))
      .catch(() => toast.error('Could not load FAQ entries.'))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))]
  const filtered = faqs.filter(f => {
    const matchCat = category === 'All' || f.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    return matchCat && matchSearch
  })
  const selected = faqs.find(f => f._id === selectedId)

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Select the matching FAQ entry</p>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by keyword..."
          className="input-dark pl-9 py-2 text-sm" />
      </div>

      {!loading && categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                category === c ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-dark-500 text-slate-500 bg-dark-700 hover:text-slate-300'
              }`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-3">Loading FAQ entries…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-3">No entries match your search.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 mb-3">
          {filtered.map(f => (
            <button key={f._id} onClick={() => setSelectedId(f._id)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                selectedId === f._id ? 'border-blue-500/40 bg-blue-500/10 text-slate-100' : 'border-dark-500/50 bg-dark-700 text-slate-300 hover:border-dark-400'
              }`}>
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${selectedId === f._id ? 'border-blue-400' : 'border-dark-400'}`}>
                {selectedId === f._id && <div className="w-2 h-2 rounded-full bg-blue-400" />}
              </div>
              {f.sectionId && <span className="text-xs font-mono text-blue-400 flex-shrink-0">§{f.sectionId}</span>}
              <span className="line-clamp-1">{f.question}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-dark-700 border-l-2 border-blue-500/40 rounded-r-xl p-3.5 mb-3">
          <p className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1.5">
            <BookOpen size={11} /> {selected.category}{selected.sectionId && ` — §${selected.sectionId}`}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{selected.answer}</p>
        </div>
      )}

      <button disabled={!selectedId || submitting} onClick={() => onSubmit({ type: 'find', faqId: selectedId })}
        className="btn-primary flex items-center gap-2 text-sm">
        <Send size={14} /> {submitting ? 'Submitting…' : 'Submit — point to this FAQ'}
      </button>
    </div>
  )
}

// ── Create FAQ ──────────────────────────────────────────────────────────
function CreateFAQ({ onSubmit, submitting }) {
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const canSubmit = q.trim().length > 8 && a.trim().length > 20

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Write a proposed FAQ entry</p>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Write it generically — for any intern who could have this question, not just this one.
        It goes to admin for review before going live.
      </p>

      <label className="text-xs font-medium text-slate-400 block mb-1.5">Proposed FAQ question</label>
      <input value={q} onChange={e => setQ(e.target.value)} maxLength={200}
        placeholder="e.g. Why does the portal show 'Pending Review' after upload?"
        className="input-dark text-sm mb-1" />
      <p className="text-xs text-slate-600 text-right mb-3">{q.length}/200</p>

      <label className="text-xs font-medium text-slate-400 block mb-1.5">Answer</label>
      <textarea value={a} onChange={e => setA(e.target.value)} maxLength={2000} rows={5}
        placeholder="Write a clear, complete answer any intern in this situation could use…"
        className="input-dark resize-none text-sm mb-1" />
      <p className="text-xs text-slate-600 text-right mb-4">{a.length}/2000</p>

      <button disabled={!canSubmit || submitting}
        onClick={() => onSubmit({ type: 'create', proposedQuestion: q, proposedAnswer: a })}
        className="btn-primary flex items-center gap-2 text-sm">
        <Send size={14} /> {submitting ? 'Submitting…' : 'Submit for admin review'}
      </button>
    </div>
  )
}

// ── Success screen ──────────────────────────────────────────────────────
function SuccessScreen({ result, onPullAnother }) {
  const isFind = result.type === 'find'
  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={26} />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">
        {isFind ? 'Answer submitted' : 'Proposal sent to admin'}
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        {isFind
          ? <>The asker will be directed to the FAQ entry. You've earned <span className="text-emerald-400 font-medium">+15 pts</span>.</>
          : <>If approved, you'll earn <span className="text-emerald-400 font-medium">+40 pts</span> and get permanent credit on the new entry.</>}
      </p>
      <button onClick={onPullAnother} className="btn-primary inline-flex items-center gap-2">
        <Inbox size={15} /> Pull another question
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export default function AnswerQueue() {
  const [view, setView] = useState('idle') // idle | claimed | submitted | expired
  const [queueStats, setQueueStats] = useState({ open: 0, stalled: 0, answeredToday: 0 })
  const [myStats, setMyStats] = useState({ points: 0, given: 0, accepted: 0 })
  const [question, setQuestion] = useState(null)
  const [answerType, setAnswerType] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)
  const [pulling, setPulling] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [secsLeft, setSecsLeft] = useState(LOCK_SECONDS)
  const timerRef = useRef(null)

  useEffect(() => {
    fetchStats()
    return () => clearInterval(timerRef.current)
  }, [])

  const fetchStats = async () => {
    try {
      const [qs, ms] = await Promise.all([
        api.get('/answer-queue/stats'),
        api.get('/answer-queue/me/stats'),
      ])
      setQueueStats(qs.data)
      setMyStats(ms.data)
    } catch (e) { /* silent */ }
  }

  const startTimer = (expiresAt) => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
      setSecsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        setView('expired')
      }
    }, 1000)
  }

  const handlePull = async () => {
    setPulling(true)
    try {
      const res = await api.post('/answer-queue/pull')
      setQuestion(res.data.question)
      setSecsLeft(Math.floor((new Date(res.data.expiresAt) - Date.now()) / 1000))
      startTimer(res.data.expiresAt)
      setView('claimed')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not pull a question.')
    }
    setPulling(false)
  }

  const handleSkip = async () => {
    if (!question) return
    try {
      await api.post(`/answer-queue/${question._id}/skip`)
      toast.success('Returned to queue.')
    } catch (e) { /* silent */ }
    clearInterval(timerRef.current)
    resetToIdle()
  }

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    try {
      const res = await api.post(`/answer-queue/${question._id}/answer`, payload)
      clearInterval(timerRef.current)
      setSubmitResult({ ...payload, pointsEarned: res.data.pointsEarned })
      setView('submitted')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Submission failed.')
    }
    setSubmitting(false)
  }

  const resetToIdle = () => {
    setView('idle')
    setQuestion(null)
    setAnswerType(null)
    setSubmitResult(null)
    setSecsLeft(LOCK_SECONDS)
    fetchStats()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {/* ── idle ── */}
        {view === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
                <Inbox size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Answer a Question</h1>
                <p className="text-sm text-slate-500">Pull from the queue · 3 hours to respond</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card-dark p-4 text-center">
                <p className="text-2xl font-bold text-white">{queueStats.open}</p>
                <p className="text-xs text-slate-500 mt-0.5">open</p>
              </div>
              <div className="card-dark p-4 text-center">
                <p className="text-2xl font-bold text-white">{queueStats.stalled}</p>
                <p className="text-xs text-slate-500 mt-0.5">stalled</p>
              </div>
              <div className="card-dark p-4 text-center">
                <p className="text-2xl font-bold text-white">{queueStats.answeredToday}</p>
                <p className="text-xs text-slate-500 mt-0.5">answered today</p>
              </div>
            </div>

            <div className="card-dark p-4 mb-6 flex items-center gap-2.5">
              <Star size={16} className="text-amber-400 flex-shrink-0" />
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">{myStats.points}</span> pts ·{' '}
                <span className="font-semibold text-white">{myStats.given}</span> answers given ·{' '}
                <span className="font-semibold text-white">{myStats.accepted}</span> accepted
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePull} disabled={pulling} className="btn-primary flex items-center gap-2">
                <Inbox size={16} /> {pulling ? 'Pulling…' : 'Pull a question'}
              </button>
              <p className="text-xs text-slate-600">assigned randomly from queue</p>
            </div>
          </motion.div>
        )}

        {/* ── claimed ── */}
        {view === 'claimed' && question && (
          <motion.div key="claimed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-white">Answering this question</h1>
                <p className="text-sm text-slate-500">Claimed just now</p>
              </div>
              <TimerBar secsLeft={secsLeft} />
            </div>

            <QuestionCard question={question} />

            <div className="card-dark p-5">
              {!answerType ? (
                <TypeSelect onSelect={setAnswerType} />
              ) : answerType === 'find' ? (
                <FindFAQ onSubmit={handleSubmit} submitting={submitting} />
              ) : (
                <CreateFAQ onSubmit={handleSubmit} submitting={submitting} />
              )}
            </div>

            {answerType && (
              <div className="flex items-center gap-2.5">
                <button onClick={() => setAnswerType(null)}
                  className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all">
                  <ArrowLeft size={12} /> Change type
                </button>
                <button onClick={() => { if (window.confirm('Return this question to the queue?')) handleSkip() }}
                  className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-500 text-slate-500 hover:text-slate-300 hover:bg-dark-600 transition-all">
                  <X size={12} /> Skip question
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── submitted ── */}
        {view === 'submitted' && submitResult && (
          <motion.div key="submitted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessScreen result={submitResult} onPullAnother={resetToIdle} />
          </motion.div>
        )}

        {/* ── expired ── */}
        {view === 'expired' && (
          <motion.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlarmClockOff size={26} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Time expired</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
              This question has returned to the queue. Another intern can claim it.
            </p>
            <button onClick={resetToIdle} className="btn-primary inline-flex items-center gap-2">
              <Inbox size={15} /> Pull another question
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
