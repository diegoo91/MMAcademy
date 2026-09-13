import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Lock, LogIn, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login, logout, openLoginModal } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.')
      return
    }
    setLoading(true)
    try {
      const u = await login(email, password)
      if (u.role === 'superadmin' || u.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 bg-lime-400 text-slate-950 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl mb-6 shadow-xl shadow-lime-400/30">
            {user.name.charAt(0)}
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Welcome back, {user.name}!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">You are signed in as {user.email}.</p>
          <div className="space-y-3">
            {(user.role === 'superadmin' || user.role === 'admin' || user.role === 'coach') && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-all"
              >
                Go to Dashboard
              </button>
            )}
            <button
              onClick={() => navigate('/book')}
              className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-all"
            >
              Book a Session
            </button>
            <button
              onClick={logout}
              className="w-full py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-300 dark:border-slate-700 transition-all"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-20 right-10 w-96 h-96 bg-lime-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-lime-400/80 shadow-lg shadow-lime-400/20 mx-auto mb-4 bg-white dark:bg-slate-900">
            <img src="/images/logo.jpg" alt="MM Padel Academy Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-heading text-3xl font-black text-slate-900 dark:text-white">Member Login</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Access your MM Padel Academy portal</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 text-sm transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-center">
            <button onClick={openLoginModal} type="button" className="text-xs text-lime-400 hover:text-lime-300 font-medium underline underline-offset-4">
              Or open quick login popup
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-lime-400/5 border border-lime-400/20 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
            <span>Admin: admin@mmpadel.com / Admin123!</span>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-lime-400 font-semibold hover:underline">Create an Account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
