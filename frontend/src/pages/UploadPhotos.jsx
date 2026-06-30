import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud, Image as ImageIcon, Trash2, Brain, Send, CheckCircle,
  AlertTriangle, BookOpen, ChevronUp, ChevronDown, Sparkles, ArrowUpRight, Zap
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

function ConfidenceBadge({ level, score }) {
  const cfg = {
    high: { class: 'badge-high', icon: CheckCircle, label: 'High Confidence' },
    medium: { class: 'badge-medium', icon: CheckCircle, label: 'Medium Confidence' },
    low: { class: 'badge-low', icon: AlertTriangle, label: 'Low Confidence' },
  }
  const c = cfg[level] || cfg.medium
  return (
    <div className={`inline-flex items-center gap-1.5 ${c.class}`}>
      <c.icon size={12} />
      {c.label} {score ? `(${score.toFixed(0)}%)` : ''}
    </div>
  )
}

function SourceCard({ section, category, question, similarity }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-dark-700 border border-dark-500/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark-600/50 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
          <BookOpen size={13} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          {section && <span className="text-xs font-mono text-blue-400 mr-2">§{section}</span>}
          <span className="text-sm text-slate-300 truncate">{question?.substring(0, 60)}...</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{similarity?.toFixed(0)}% match</span>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-dark-500/50">
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-slate-300 mb-1">{question}</p>
              <span className="badge-category">{category}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function UploadPhotos() {
  const navigate = useNavigate()
  const [image, setImage] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    processFile(file)
  }

  const processFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image size must be under 4MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage({
        data: reader.result.split(',')[1],
        mimeType: file.type,
        preview: reader.result
      })
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImage(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAnalyze = async () => {
    if (!image) {
      toast.error('Please upload a photo first')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await api.post('/ai/ask', {
        question: description,
        image: {
          data: image.data,
          mimeType: image.mimeType
        }
      })
      setResult(res.data)
      toast.success('Photo analyzed successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to analyze photo')
    } finally {
      setLoading(false)
    }
  }

  const handleRaiseQuery = () => {
    navigate('/raise-query', {
      state: {
        title: description ? `Visual Query: ${description.substring(0, 50)}...` : 'Visual Issue / Screen Error',
        content: description || 'Visual issue uploaded for review. Please see the attached screenshot.',
        images: [image.preview],
        category: result?.sourceDetails?.[0]?.category || 'General'
      }
    })
  }

  const confidenceBarWidth = result ? `${Math.min(result.confidenceScore || 0, 100)}%` : '0%'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <ImageIcon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Ask with Photo</h1>
          <p className="text-sm text-slate-500">Scan screenshots or error reports to map them directly to official FAQs</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Column */}
        <div className="space-y-4">
          <div className="card-dark p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">1. Upload Screenshot / Photo</h2>
            
            {!image ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[220px] ${
                  isDragOver
                    ? 'border-violet-500 bg-violet-500/5'
                    : 'border-dark-500 hover:border-violet-500/50 hover:bg-dark-700/50'
                }`}
              >
                <UploadCloud size={32} className="text-slate-500 mb-3" />
                <p className="text-sm text-slate-300 font-medium mb-1">Drag & drop your screenshot here</p>
                <p className="text-xs text-slate-500">or click to browse from files</p>
                <p className="text-[10px] text-slate-600 mt-4">Supports PNG, JPG, JPEG (Max 4MB)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-dark-500 bg-dark-800">
                <img
                  src={image.preview}
                  alt="Upload preview"
                  className="w-full h-auto max-h-[300px] object-contain mx-auto p-2"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-3 right-3 p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-xl shadow-lg transition-colors"
                  title="Remove image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="card-dark p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-2">2. Describe the Issue (Optional)</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, error messages, or what you were doing when this happened..."
              className="input-dark resize-none text-sm"
              rows={4}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !image}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 py-3 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="flex gap-1 items-center">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </span>
                  Scanning visual cues...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Analyze Photo
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card-dark p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
              >
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 animate-pulse">
                  <Brain size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">VINS AI is processing</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Our AI is extracting keywords from the image, querying FAQ records, and grounding the response.
                  </p>
                </div>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="card-dark border-violet-500/20 bg-gradient-to-br from-violet-600/5 to-indigo-600/5">
                  <div className="flex items-start justify-between p-5 pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                        <Zap size={14} className="text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Analysis Result</div>
                        <div className="text-xs text-slate-500">FAQ-grounded resolution</div>
                      </div>
                    </div>
                    <ConfidenceBadge level={result.confidence} score={result.confidenceScore} />
                  </div>

                  {/* Confidence Bar */}
                  <div className="px-5 pt-3">
                    <div className="h-1 bg-dark-600 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: confidenceBarWidth }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="confidence-bar" />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-600">Confidence</span>
                      <span className="text-xs text-slate-500">{result.confidenceScore?.toFixed(0)}% · Based on {result.sourceDetails?.length || 0} FAQs</span>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="p-5">
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                  </div>

                  {/* Warning */}
                  {result.escalationRequired && (
                    <div className="mx-5 mb-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl flex items-start gap-3">
                      <AlertTriangle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-300">Mentor escalation recommended</p>
                        <p className="text-xs text-amber-400/70 mt-1">AI confidence is low. You can raise a community discussion for direct mentor support.</p>
                      </div>
                    </div>
                  )}

                  {/* Citations */}
                  {result.sourceSections?.length > 0 && (
                    <div className="px-5 pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600">Sources:</span>
                        {result.sourceSections.map((s, i) => (
                          <span key={i} className="text-xs font-mono bg-dark-700 text-violet-400 px-2 py-0.5 rounded-md border border-dark-500">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FAQ Sources list */}
                {result.sourceDetails?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <BookOpen size={12} /> Matching FAQ references
                    </h3>
                    {result.sourceDetails.map((s, i) => (
                      <SourceCard key={i} section={s.sectionId} category={s.category}
                        question={s.question} similarity={s.similarity} />
                    ))}
                  </div>
                )}

                {/* Follow Ups */}
                {result.followUpSuggestions?.length > 0 && (
                  <div className="card-dark p-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                      <Sparkles size={12} /> You might also want to know:
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {result.followUpSuggestions.map((q, i) => (
                        <div key={i} className="text-xs bg-dark-700 border border-dark-500/50 text-slate-300 p-2.5 rounded-xl flex items-center justify-between">
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalation Button */}
                <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <div className="text-sm font-semibold text-white">Still confused?</div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Raise a community discussion ticket pre-filled with this screenshot and your description so mentors can help you.
                  </p>
                  <button onClick={handleRaiseQuery} className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-xs">
                    Raise Discussion with this Photo <ArrowUpRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {!result && !loading && (
              <div className="card-dark p-8 flex flex-col items-center justify-center text-center text-slate-500 min-h-[300px]">
                <ImageIcon size={32} className="mb-2 text-slate-600" />
                <p className="text-sm">Upload a screenshot on the left and click Analyze</p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  The AI will automatically decipher error messages, system notifications, or schedules to guide you.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
