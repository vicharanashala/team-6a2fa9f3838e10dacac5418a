import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, Wand2, Search, AlertCircle, CheckCircle, ArrowRight, X, Loader } from 'lucide-react'
import { useAuthStore } from '../store'
import api from '../utils/api'
import toast from 'react-hot-toast'

const CATEGORIES = ['NOC', 'Offer Letter', 'ViBe', 'Rosetta', 'Team Formation', 'Coursework', 'Mentor Support', 'AI/Yaksha', 'Certificate', 'Timing', 'About', 'General']
const TAG_SUGGESTIONS = ['urgent', 'bug', 'vibe-issue', 'noc-help', 'offer-letter', 'rosetta', 'team', 'certificate', 'phase1', 'phase2']

export default function RaiseQuery() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', content: '', category: '', tags: [] })
  const [refined, setRefined] = useState(null)
  const [duplicates, setDuplicates] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [refining, setRefining] = useState(false)
  const [checking, setChecking] = useState(false)
  const [step, setStep] = useState(1) // 1=form, 2=review, 3=done
  const [newTag, setNewTag] = useState('')

  const handleRefine = async () => {
    if (!form.title.trim()) return
    setRefining(true)
    try {
      const res = await api.post('/ai/refine', { question: form.title })
      setRefined(res.data.refined)
      toast.success('Question refined by AI!')
    } catch (e) {
      toast.error('Refinement failed')
    }
    setRefining(false)
  }

  const handleCheckDuplicate = async () => {
    if (!form.title.trim()) { toast.error('Enter a title first'); return }
    setChecking(true)
    try {
      const res = await api.post('/ai/check-duplicate', { question: form.title })
      setDuplicates(res.data)
      setStep(2)
    } catch (e) {
      toast.error('Check failed')
    }
    setChecking(false)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.content || !form.category) {
      toast.error('Title, content and category are required')
      return
    }
    setSubmitting(true)
    try {
      const data = { ...form, refinedTitle: refined || form.title }
      const res = await api.post('/queries', data)
      toast.success('Query posted! AI is generating an answer...')
      navigate(`/discussions/${res.data._id}`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to post query')
    }
    setSubmitting(false)
  }

  const addTag = (tag) => {
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setNewTag('')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
          <MessageSquarePlus size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Raise a Query</h1>
          <p className="text-sm text-slate-500">AI checks for duplicates and related FAQs before you post</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-emerald-600 text-white' : 'bg-dark-600 text-slate-500'
            }`}>
              {step > s ? <CheckCircle size={14} /> : s}
            </div>
            <span className={`text-sm ${step === s ? 'text-slate-200' : 'text-slate-600'}`}>
              {s === 1 ? 'Describe Issue' : s === 2 ? 'AI Review' : 'Posted'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-dark-500 mx-1" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5">
            {/* Title */}
            <div className="card-dark p-5">
              <label className="text-sm font-medium text-slate-300 mb-2 block">Question title *</label>
              <div className="flex gap-2">
                <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setRefined(null) }}
                  className="input-dark flex-1" placeholder="What is your question? Be specific." />
                <button onClick={handleRefine} disabled={!form.title || refining}
                  className="btn-secondary flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                  {refining ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  {refining ? '' : 'Refine'}
                </button>
              </div>
              {refined && refined !== form.title && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Wand2 size={12} className="text-violet-400" />
                    <span className="text-xs text-violet-400 font-medium">AI suggested improvement</span>
                  </div>
                  <p className="text-sm text-slate-200">{refined}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setForm(f => ({ ...f, title: refined })); setRefined(null) }}
                      className="text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 px-3 py-1 rounded-lg transition-colors">
                      Use this
                    </button>
                    <button onClick={() => setRefined(null)} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1">
                      Keep original
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Category */}
            <div className="card-dark p-5">
              <label className="text-sm font-medium text-slate-300 mb-3 block">Category *</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                      form.category === cat
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-dark-700 border-dark-500/50 text-slate-400 hover:text-slate-200 hover:border-dark-400'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="card-dark p-5">
              <label className="text-sm font-medium text-slate-300 mb-2 block">Describe your issue *</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="input-dark resize-none" rows={5}
                placeholder="Provide full context. What did you try? What error or confusion are you facing? The more specific, the better the AI answer will be." />
              <p className="text-xs text-slate-600 mt-1.5">{form.content.length} characters · Be specific for better AI matching</p>
            </div>

            {/* Tags */}
            <div className="card-dark p-5">
              <label className="text-sm font-medium text-slate-300 mb-3 block">Tags (optional)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.tags.map(tag => (
                  <span key={tag} className="badge-category flex items-center gap-1">
                    {tag}
                    <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {TAG_SUGGESTIONS.filter(t => !form.tags.includes(t)).map(t => (
                  <button key={t} onClick={() => addTag(t)}
                    className="text-xs text-slate-500 hover:text-slate-300 bg-dark-700 hover:bg-dark-600 border border-dark-500/50 px-2 py-1 rounded-lg transition-colors">
                    + {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag(newTag)}
                  className="input-dark flex-1 py-2 text-sm" placeholder="Custom tag + Enter" />
              </div>
            </div>

            <button onClick={handleCheckDuplicate} disabled={!form.title || !form.content || !form.category || checking}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {checking ? <><Loader size={16} className="animate-spin" /> Checking for duplicates...</>
                : <><Search size={16} /> Check & Continue <ArrowRight size={16} /></>}
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5">
            <h2 className="text-lg font-semibold text-white">AI Pre-Check Results</h2>

            {/* Duplicate warning */}
            {duplicates?.hasDuplicates && (
              <div className="card-dark border-amber-500/20 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">Similar questions found!</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">Check these before posting — your answer might already exist:</p>
                <div className="space-y-2">
                  {duplicates.similarQueries.map(q => (
                    <button key={q.id} onClick={() => navigate(`/discussions/${q.id}`)}
                      className="w-full text-left p-3 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors border border-dark-500/50 hover:border-amber-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="badge-category">{q.category}</span>
                        <span className="text-xs text-slate-500">{q.similarity}% similar</span>
                      </div>
                      <p className="text-sm text-slate-300">{q.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related FAQs */}
            {duplicates?.relatedFAQs?.length > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Related FAQ entries found</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">These FAQs might answer your question directly:</p>
                <div className="space-y-2">
                  {duplicates.relatedFAQs.map(faq => (
                    <div key={faq.id} className="p-3 bg-dark-700 rounded-xl border border-dark-500/50">
                      {faq.sectionId && <span className="text-xs font-mono text-blue-400 mr-2">§{faq.sectionId}</span>}
                      <span className="badge-category mb-1.5 inline-block">{faq.category}</span>
                      <p className="text-sm font-medium text-slate-200">{faq.question}</p>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!duplicates?.hasDuplicates && !duplicates?.relatedFAQs?.length && (
              <div className="card-dark border-emerald-500/20 p-5 flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">No duplicates found!</p>
                  <p className="text-xs text-slate-500 mt-0.5">Your question appears to be unique. Proceed to post.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back to Edit</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? <><Loader size={14} className="animate-spin" /> Posting...</>
                  : <><CheckCircle size={14} /> Post Query</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
