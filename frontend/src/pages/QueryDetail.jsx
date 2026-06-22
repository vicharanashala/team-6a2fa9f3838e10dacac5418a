import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Brain, BookOpen, ThumbsUp, ThumbsDown, CheckCircle,
         AlertTriangle, Bookmark, Share2, Flag, Plus, Loader, Shield,
         ChevronDown, ChevronUp, Sparkles, Send, Database } from 'lucide-react'
import { useAuthStore } from '../store'
import api from '../utils/api'
import toast from 'react-hot-toast'

function ConfidenceMeter({ level, score }) {
  const colors = { high: '#10B981', medium: '#F59E0B', low: '#F43F5E' }
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score || 0}%` }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{ background: colors[level] || colors.medium }}
          className="h-full rounded-full" />
      </div>
      <span className="text-xs font-mono text-slate-400 w-12">{score?.toFixed(0)}%</span>
    </div>
  )
}

function AIAnswerCard({ aiAnswer }) {
  const [expanded, setExpanded] = useState(true)
  if (!aiAnswer?.content) return null

  return (
    <div className="card-dark border-blue-500/20 bg-gradient-to-br from-blue-600/5 to-violet-600/5">
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Brain size={15} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                VINS AI
                <span className="text-xs bg-blue-500/15 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  RAG-Grounded
                </span>
              </div>
              <div className="text-xs text-slate-500">Powered by Gemini · FAQ-verified</div>
            </div>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-dark-600 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Confidence */}
        <div className="mt-4 mb-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Confidence</span>
            <div className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              aiAnswer.confidence === 'high' ? 'badge-high' :
              aiAnswer.confidence === 'medium' ? 'badge-medium' : 'badge-low'
            }`}>
              {aiAnswer.confidence?.charAt(0).toUpperCase() + aiAnswer.confidence?.slice(1)} Confidence
            </div>
          </div>
          <ConfidenceMeter level={aiAnswer.confidence} score={aiAnswer.confidenceScore} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-5">
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{aiAnswer.content}</div>
            </div>

            {aiAnswer.escalationRequired && (
              <div className="mx-5 mb-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Mentor escalation recommended</p>
                  <p className="text-xs text-amber-400/70 mt-1">AI confidence is low for this topic. Use #escalate in Yaksha chat for direct mentor support.</p>
                </div>
              </div>
            )}

            {aiAnswer.sourceSections?.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600">Based on:</span>
                  {aiAnswer.sourceSections.map((s, i) => (
                    <span key={i} className="text-xs font-mono bg-dark-700 text-blue-400 px-2 py-0.5 rounded-md border border-dark-500">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {aiAnswer.followUpSuggestions?.length > 0 && (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                  <Sparkles size={12} /> Related questions you might have:
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiAnswer.followUpSuggestions.map((q, i) => (
                    <span key={i} className="text-xs bg-dark-700 border border-dark-500/50 text-slate-400 px-3 py-1.5 rounded-xl">
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnswerCard({ answer, onVote, user, onAddToKB }) {
  const isOwner = user?._id === answer.author?._id
  const userVote = answer.voters?.find(v => v.user === user?._id)?.vote

  const labelCfg = {
    'FAQ Based': { class: 'badge-high', icon: BookOpen },
    'Mentor Verified': { class: 'bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs font-medium px-2.5 py-1 rounded-full', icon: Shield },
    'Community Answer': { class: 'badge-category', icon: null },
    'AI Assisted': { class: 'badge-medium', icon: Brain },
    'Pending Validation': { class: 'badge-low', icon: AlertTriangle },
  }
  const lc = labelCfg[answer.sourceLabel] || labelCfg['Community Answer']

  return (
    <div className={`card-dark p-5 ${answer.isAccepted ? 'border-emerald-500/20 bg-emerald-500/3' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {answer.author?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">{answer.author?.name || 'Anonymous'}</span>
            {answer.author?.role === 'mentor' && (
              <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield size={10} /> Mentor
              </span>
            )}
            <span className={lc.class}>{answer.sourceLabel}</span>
            {answer.isAccepted && (
              <span className="badge-high flex items-center gap-1"><CheckCircle size={10} /> Accepted</span>
            )}
            {answer.addedToKnowledgeBase && (
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Database size={10} /> In Knowledge Base
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap ml-11">{answer.content}</div>

      <div className="flex items-center gap-3 mt-4 ml-11">
        <button onClick={() => onVote(answer._id, 'up')}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
            userVote === 'up' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' : 'border-dark-500 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
          }`}>
          <ThumbsUp size={12} /> {answer.upvotes || 0}
        </button>
        <button onClick={() => onVote(answer._id, 'down')}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
            userVote === 'down' ? 'bg-rose-500/15 border-rose-500/20 text-rose-400' : 'border-dark-500 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
          }`}>
          <ThumbsDown size={12} /> {answer.downvotes || 0}
        </button>
        {(user?.role === 'mentor' || user?.role === 'admin') && !answer.addedToKnowledgeBase && (
          <button onClick={() => onAddToKB(answer._id)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-all ml-auto">
            <Database size={11} /> Add to Knowledge Base
          </button>
        )}
      </div>
    </div>
  )
}

export default function QueryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const [query, setQuery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answerText, setAnswerText] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [addToKB, setAddToKB] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  useEffect(() => { fetchQuery() }, [id])

  const fetchQuery = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/queries/${id}`)
      setQuery(res.data)
      setBookmarked(user?.bookmarkedQueries?.includes(id))
    } catch (e) {
      toast.error('Query not found')
      navigate('/discussions')
    }
    setLoading(false)
  }

  const handleVote = async (answerId, vote) => {
    if (!token) { toast.error('Please log in to vote'); return }
    try {
      await api.post(`/queries/${id}/vote`, { answerId, vote })
      fetchQuery()
    } catch (e) { toast.error('Vote failed') }
  }

  const handleAnswer = async (e) => {
    e.preventDefault()
    if (!answerText.trim()) return
    setSubmittingAnswer(true)
    try {
      await api.post(`/queries/${id}/answers`, { content: answerText, addToKnowledgeBase: addToKB })
      setAnswerText('')
      setAddToKB(false)
      toast.success(addToKB ? 'Answer posted + added to knowledge base! 🎉' : 'Answer posted!')
      fetchQuery()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to post answer')
    }
    setSubmittingAnswer(false)
  }

  const handleBookmark = async () => {
    if (!token) { toast.error('Please log in'); return }
    try {
      const res = await api.post(`/queries/${id}/bookmark`)
      setBookmarked(res.data.bookmarked)
      toast.success(res.data.bookmarked ? 'Bookmarked!' : 'Removed from bookmarks')
    } catch (e) { toast.error('Failed') }
  }

  const handleEscalate = async () => {
    try {
      await api.patch(`/queries/${id}/escalate`)
      toast.success('Query escalated to mentor team!')
      fetchQuery()
    } catch (e) { toast.error('Escalation failed') }
  }

  const handleAddToKB = async (answerId) => {
    try {
      const answer = query.answers.find(a => a._id === answerId)
      await api.post(`/queries/${id}/answers`, { content: answer.content, addToKnowledgeBase: true })
      toast.success('Added to knowledge base! Future AI answers will use this. 🧠')
      fetchQuery()
    } catch (e) { toast.error('Failed to add to knowledge base') }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-dark-700 rounded w-3/4" />
          <div className="h-32 bg-dark-700 rounded" />
          <div className="h-48 bg-dark-700 rounded" />
        </div>
      </div>
    )
  }

  if (!query) return null

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 1) return 'just now'
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/discussions')} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm">
        <ArrowLeft size={16} /> Back to Discussions
      </button>

      {/* Question */}
      <div className="card-dark p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="badge-category">{query.category}</span>
          {query.tags?.map(t => (
            <span key={t} className="text-xs text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
          {query.isEscalated && (
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} /> Escalated to Mentor
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{query.refinedTitle || query.title}</h1>
        {query.refinedTitle && query.refinedTitle !== query.title && (
          <p className="text-xs text-slate-600 mb-3">Original: "{query.title}"</p>
        )}
        <p className="text-slate-300 leading-relaxed">{query.content}</p>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-dark-500/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
              {query.author?.name?.charAt(0).toUpperCase()}
            </div>
            <span>{query.author?.name}</span>
            <span>·</span><span>{timeAgo(query.createdAt)}</span>
            <span>·</span><span>{query.views} views</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBookmark}
              className={`p-2 rounded-lg border transition-all ${bookmarked ? 'bg-amber-500/15 border-amber-500/20 text-amber-400' : 'border-dark-500 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}>
              <Bookmark size={14} />
            </button>
            <button onClick={handleEscalate} className="p-2 rounded-lg border border-dark-500 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all">
              <AlertTriangle size={14} />
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!') }}
              className="p-2 rounded-lg border border-dark-500 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
              <Share2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Answer */}
      <AIAnswerCard aiAnswer={query.aiAnswer} />

      {/* Related FAQs */}
      {query.relatedFAQs?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Related FAQ entries
          </h3>
          <div className="grid gap-2">
            {query.relatedFAQs.map(faq => (
              <div key={faq._id} className="card-dark p-4 border-blue-500/10">
                <div className="flex items-center gap-2 mb-1">
                  {faq.sectionId && <span className="text-xs font-mono text-blue-400">§{faq.sectionId}</span>}
                  <span className="badge-category">{faq.category}</span>
                </div>
                <p className="text-sm font-medium text-slate-300">{faq.question}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Answers */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          Answers <span className="text-sm text-slate-500 font-normal">({query.answers?.length || 0})</span>
        </h3>
        {query.answers?.length === 0
          ? (
            <div className="card-dark p-8 text-center">
              <p className="text-slate-500">No community answers yet. Be the first to help!</p>
            </div>
          )
          : (
            <div className="space-y-4">
              {query.answers?.map(answer => (
                <AnswerCard key={answer._id} answer={answer} onVote={handleVote}
                  user={user} onAddToKB={handleAddToKB} />
              ))}
            </div>
          )
        }
      </div>

      {/* Add Answer */}
      {token && (
        <div className="card-dark p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={16} /> Your Answer
          </h3>
          <form onSubmit={handleAnswer}>
            <textarea value={answerText} onChange={e => setAnswerText(e.target.value)}
              className="input-dark resize-none mb-3" rows={4}
              placeholder="Share your knowledge or experience. Be specific and helpful." />
            {(user?.role === 'mentor' || user?.role === 'admin') && (
              <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
                <div onClick={() => setAddToKB(v => !v)}
                  className={`w-10 h-5 rounded-full border transition-all relative ${addToKB ? 'bg-blue-600 border-blue-500' : 'bg-dark-600 border-dark-500'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${addToKB ? 'left-5' : 'left-0.5'}`} />
                </div>
                <div>
                  <span className="text-sm text-slate-300 flex items-center gap-1.5">
                    <Database size={13} className="text-blue-400" /> Add to Knowledge Base
                  </span>
                  <p className="text-xs text-slate-600">Future AI answers will use this answer as a source</p>
                </div>
              </label>
            )}
            <button type="submit" disabled={!answerText.trim() || submittingAnswer}
              className="btn-primary flex items-center gap-2">
              {submittingAnswer ? <><Loader size={14} className="animate-spin" /> Posting...</>
                : <><Send size={14} /> Post Answer</>}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
