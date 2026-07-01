import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Send, ChevronDown } from 'lucide-react'

const REASON_OPTIONS = [
  { value: 'ai_incorrect', label: 'AI answer is incorrect' },
  { value: 'not_answered', label: "Didn't answer my question" },
  { value: 'need_human', label: 'Need a human explanation' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'other', label: 'Other' },
]

export function EscalationModal({ question, aiAnswer, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const selectedReason = REASON_OPTIONS.find(r => r.value === reason)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) return
    setSubmitting(true)
    try {
      await onSubmit(reason, comments.trim() || undefined)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="card-dark w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4 border-b border-dark-500/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={15} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold dark:text-white text-slate-900">Escalate to Mentor</h2>
                <p className="text-xs text-slate-500">A mentor will review and respond</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 dark:hover:text-slate-700 hover:bg-dark-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Original Question (readonly) */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                Original Question
              </label>
              <div className="input-dark bg-dark-600/50 cursor-not-allowed opacity-75 text-sm">
                {question}
              </div>
            </div>

            {/* AI Answer (readonly) */}
            {aiAnswer && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                  AI Answer Given
                </label>
                <div className="input-dark bg-dark-600/50 cursor-not-allowed opacity-75 text-sm whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {aiAnswer}
                </div>
              </div>
            )}

            {/* Escalation Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                Escalation Reason <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  className={`w-full input-dark flex items-center justify-between text-sm ${!reason ? 'text-slate-500' : 'dark:text-slate-200 text-slate-700'}`}
                >
                  <span>{selectedReason?.label || 'Select a reason...'}</span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-500 rounded-xl overflow-hidden shadow-xl">
                    {REASON_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setReason(opt.value); setDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          reason === opt.value
                            ? 'bg-blue-600/15 text-blue-400'
                            : 'dark:text-slate-300 text-slate-700 hover:bg-dark-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Optional Comments */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                Additional Comments <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="input-dark text-sm resize-none"
                rows={3}
                placeholder="Anything else the mentor should know?"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                  : <><Send size={13} />Submit Escalation</>
                }
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}