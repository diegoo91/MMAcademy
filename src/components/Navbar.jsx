import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight, LogOut, Menu, Shield, UserPlus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, openLoginModal, isAdmin, isCoach } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Sign Up', path: '/signup' },
    { name: 'Schedule', path: '/schedule' },
    { name: 'Book a Session', path: '/book' },
  ]

  if (isAdmin || isCoach) {
    navLinks.push({ name: 'Dashboard', path: '/admin' })
  }

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-lime-400/80 shadow-lg shadow-lime-400/20 group-hover:scale-105 transition-transform bg-slate-900 shrink-0">
              <img src="/images/logo.jpg" alt="MM Padel Academy Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                MM <span className="text-lime-400">PADEL</span> ACADEMY
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest -mt-1">
                Train • Improve • Compete
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-full border border-slate-800/80">
            {navLinks.map((link) => {
              const active = isActive(link.path)
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-900/80 pl-3 pr-2 py-1.5 rounded-full border border-slate-800">
                <Link to={isAdmin ? '/admin' : '#'} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-xs border border-lime-400/40">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-tight">{user.name}</span>
                    <span className="text-[10px] text-lime-400 font-medium flex items-center gap-1">
                      {(user.role === 'superadmin' || user.role === 'admin' || user.role === 'coach') && (
                        <Shield className="w-3 h-3" />
                      )}
                      {user.role || 'Member'}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openLoginModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-full transition-all"
                >
                  Log In
                </button>
                <Link
                  to="/book"
                  className="px-5 py-2.5 text-sm font-bold rounded-full bg-lime-400 hover:bg-lime-300 text-slate-950 transition-all shadow-lg shadow-lime-400/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Session</span>
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                isActive(link.path)
                  ? 'bg-lime-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <span>{link.name}</span>
              <ChevronRight className="w-5 h-5 opacity-60" />
            </Link>
          ))}

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            {user ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{user.name}</p>
                  <p className="text-xs text-lime-400 flex items-center gap-1">
                    {(user.role === 'superadmin' || user.role === 'admin' || user.role === 'coach') && (
                      <Shield className="w-3 h-3" />
                    )}
                    {user.role || user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    openLoginModal()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-center text-sm"
                >
                  Log In
                </button>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-xl bg-lime-400 text-slate-950 font-bold text-center text-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
