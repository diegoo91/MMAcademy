import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronLeft, FileUp, LayoutDashboard, LogOut, Shield, Users, UserX } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const sidebarLinks = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Players', path: '/admin/players', icon: Users },
  { name: 'Results', path: '/admin/results', icon: BarChart3 },
  { name: 'Users', path: '/admin/users', icon: UserX },
  { name: 'Imports', path: '/admin/imports', icon: FileUp },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-slate-950">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col bg-slate-900/50 border-r border-slate-800 transition-all duration-300`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-lime-400" />
              <span className="font-bold text-white text-sm">Admin Panel</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className={`w-4 h-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map(link => {
            const active = isActive(link.path, link.exact)
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
                title={!sidebarOpen ? link.name : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{link.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Back to Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all mt-1"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="md:hidden flex items-center gap-2 mb-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white">Admin Panel</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
