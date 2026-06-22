import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Brain, BarChart3, Shield, ArrowRight, ChevronRight, Sparkles, TrendingUp, Users } from 'lucide-react'

const features = [
  { icon: Brain, title: 'RAG-Powered AI', desc: 'Answers grounded in real FAQ data. Zero hallucinations.', color: 'blue' },
  { icon: Shield, title: 'Confidence Scoring', desc: 'Every answer rated High/Medium/Low with source citations.', color: 'violet' },
  { icon: BarChart3, title: 'Confusion Analytics', desc: 'See what\'s confusing 500+ interns in real-time.', color: 'emerald' },
  { icon: TrendingUp, title: 'Continuous Learning', desc: 'Platform grows smarter as mentors validate answers.', color: 'amber' },
]

const stats = [
  { value: '180+', label: 'FAQ Entries' },
  { value: '500+', label: 'Interns Served' },
  { value: '94%', label: 'Query Resolution' },
  { value: '0', label: 'Hallucinations' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-900 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-dark-900/80 border-b border-dark-600/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">VINS</span>
          <span className="text-xs text-slate-500 font-mono">AI Intelligence</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-slate-400 hover:text-white text-sm transition-colors">Sign In</Link>
          <Link to="/signup" className="btn-primary text-sm py-2">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-8">
              <Sparkles size={14} />
              Vicharanashala × IIT Ropar · Summership 2026
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              AI-Powered{' '}
              <span className="gradient-text">Internship</span>
              <br />Intelligence Platform
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Reducing repetitive confusion through contextual AI assistance.
              Grounded in real FAQ data. Zero hallucinations. Built for 500+ interns.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary flex items-center gap-2 text-base px-8 py-3.5">
                Start Using VINS <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-secondary flex items-center gap-2 text-base px-8 py-3.5">
                Sign In <ChevronRight size={18} />
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
            {stats.map((s, i) => (
              <div key={i} className="bg-dark-700/60 border border-dark-500/50 rounded-2xl p-4">
                <div className="text-3xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">Not a chatbot. An intelligence ecosystem.</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Every answer is retrieved from real FAQ data before Gemini generates a response. No guessing. No hallucinations.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="card-dark card-hover p-6">
                <div className={`w-10 h-10 rounded-xl bg-${f.color}-500/15 border border-${f.color}-500/20 flex items-center justify-center mb-4`}>
                  <f.icon size={20} className={`text-${f.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RAG Flow */}
      <section className="py-20 px-6 bg-dark-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">How the RAG pipeline works</h2>
          <p className="text-slate-400 mb-12">Your question → FAQ retrieval → Gemini generation → Confident answer</p>
          <div className="flex flex-col gap-2">
            {[
              { step: '01', title: 'You ask a question', sub: 'Typed into the AI interface' },
              { step: '02', title: 'Similar FAQs retrieved', sub: 'Cosine similarity search across 180+ entries' },
              { step: '03', title: 'Context sent to Gemini', sub: 'Only relevant FAQ context — not the whole internet' },
              { step: '04', title: 'Controlled answer generated', sub: 'With confidence score + source citations' },
              { step: '05', title: 'Knowledge base grows', sub: 'Mentor-validated answers added back to FAQ DB' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="flex items-center gap-5 bg-dark-700/60 border border-dark-500/50 rounded-xl p-4 text-left">
                <div className="text-2xl font-bold font-mono text-blue-500/40 flex-shrink-0 w-10">{item.step}</div>
                <div>
                  <div className="text-white font-medium">{item.title}</div>
                  <div className="text-slate-500 text-sm">{item.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/5 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users size={20} className="text-slate-500" />
            <span className="text-slate-500">500+ interns already using VINS</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-6">Ready to get clear answers?</h2>
          <p className="text-slate-400 mb-8">Join the platform that understands internship workflows, not just keywords.</p>
          <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-600/50 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-bold text-white">VINS</span>
        </div>
        <p className="text-slate-500 text-sm">Vicharanashala Lab for Education Design · IIT Ropar · 2026</p>
      </footer>
    </div>
  )
}
