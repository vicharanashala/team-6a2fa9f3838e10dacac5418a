import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store'
import { Zap, Eye, EyeOff, ArrowRight, Brain } from 'lucide-react'
import toast from 'react-hot-toast'

function AuthLayout({ children, title, sub }) {
  return (
    <div className="min-h-screen dark:bg-dark-900 bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold dark:text-white text-slate-900 text-xl">VINS</span>
          </Link>
          <h1 className="text-2xl font-bold dark:text-white text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-400 text-sm">{sub}</p>
        </div>
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/40">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const { login, isLoading, error: storeError } = useAuthStore()
  const [localError, setLocalError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    
    if (!form.email || !form.password) {
      setLocalError('Please enter both email and password')
      return
    }
    
    const result = await login(form.email, form.password)
    if (result.success) { 
      toast.success('Welcome back!'); 
      navigate('/home') 
    }
    else {
      setLocalError(result.error || 'Login failed. Please try again.')
      toast.error(result.error || 'Login failed')
    }
  }

  return (
    <AuthLayout title="Welcome back" sub="Sign in to your VINS account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {localError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 overflow-hidden">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-300">{localError}</p>
          </motion.div>
        )}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="input-dark" placeholder="you@example.com" required />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-dark pr-10" placeholder="••••••••" required />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed group">
          {isLoading
            ? <span className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
            : <><span className="group-disabled:hidden">Sign In</span><ArrowRight size={16} className="group-disabled:hidden" /></>}
        </button>
      </form>
      <p className="text-center text-slate-500 text-sm mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-blue-400 hover:text-blue-300">Create one</Link>
      </p>
    </AuthLayout>
  )
}

export function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '' })
  const [show, setShow] = useState(false)
  const { signup, isLoading } = useAuthStore()
  const [localError, setLocalError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    
    if (!form.name || !form.email || !form.password) {
      setLocalError('Please fill in all required fields')
      return
    }

    if (/^\d/.test(form.name)) {
      setLocalError('Name cannot start with a number')
      return
    }

    if (/^\d+$/.test(form.name.replace(/\s/g, ''))) {
      setLocalError('Name cannot contain only numbers')
      return
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
    if (!passwordRegex.test(form.password)) {
      setLocalError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
      return
    }
    
    const result = await signup(form)
    if (result.success) { 
      toast.success('Account created! Welcome to VINS 🎉'); 
      navigate('/home') 
    }
    else {
      setLocalError(result.error || 'Signup failed. Please try again.')
      toast.error(result.error || 'Signup failed')
    }
  }

  return (
    <AuthLayout title="Join VINS" sub="Create your internship intelligence account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {localError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 overflow-hidden">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-300">{localError}</p>
          </motion.div>
        )}

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Full Name</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-dark" placeholder="Your full name" required />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="input-dark" placeholder="you@example.com" required />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">College</label>
          <input type="text" value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))}
            className="input-dark" placeholder="Your college name" />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-dark pr-10" placeholder="Min 8 characters (mixed case, numbers, symbols)" required minLength={8} />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {/* Password strength */}
        {form.password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  form.password.length >= i * 2
                    ? i === 1 ? 'bg-rose-500' : i === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                    : 'bg-dark-500 dark:bg-slate-300'
                }`} />
              ))}
            </div>
            <p className={`text-xs transition-colors ${
              form.password.length >= 10 ? 'text-emerald-400' : form.password.length >= 6 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {form.password.length < 6 ? 'Too short' : form.password.length < 10 ? 'Medium strength' : 'Strong password'}
            </p>
          </div>
        )}
        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed group">
          {isLoading
            ? <span className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
            : <><span className="group-disabled:hidden">Create Account</span><ArrowRight size={16} className="group-disabled:hidden" /></>}
        </button>
      </form>
      <p className="text-center text-slate-500 text-sm mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default Login
