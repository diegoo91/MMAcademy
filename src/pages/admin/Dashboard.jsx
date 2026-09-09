import { useState, useEffect } from 'react'
import { BarChart3, Calendar, FileUp, TrendingUp, Users, UserX } from 'lucide-react'
import { api } from '../../lib/api'

function StatCard({ icon: Icon, label, value, color = 'lime' }) {
  const colors = {
    lime: 'bg-lime-400/10 text-lime-400 border-lime-400/20',
    blue: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    purple: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    rose: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    cyan: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  }
  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-black text-white font-heading">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
  if (error) return <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>
  if (!data) return null

  const { stats, recentBookings, recentImports, usersByRole } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-black text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Academy overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Users" value={stats.totalUsers} color="blue" />
        <StatCard icon={UserX} label="Players" value={stats.totalPlayers} color="purple" />
        <StatCard icon={BarChart3} label="Results" value={stats.totalResults} color="amber" />
        <StatCard icon={Calendar} label="Bookings" value={stats.totalBookings} color="lime" />
        <StatCard icon={TrendingUp} label="Revenue" value={`EGP ${stats.totalRevenue.toLocaleString()}`} color="cyan" />
        <StatCard icon={FileUp} label="Occupancy" value={`${stats.occupancyRate}%`} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Users by Role</h3>
          <div className="space-y-3">
            {usersByRole.map(r => (
              <div key={r.role} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">{r.role}</span>
                    <span className="text-white font-bold">{r.count}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-lime-400 rounded-full transition-all" style={{ width: `${stats.totalUsers > 0 ? (r.count / stats.totalUsers) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Bookings</h3>
          {recentBookings.length === 0 ? (
            <p className="text-slate-500 text-sm">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-white">{b.user_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{b.ref} - {b.session_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-lime-400">EGP {b.total?.toLocaleString()}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : b.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Imports</h3>
        {recentImports.length === 0 ? (
          <p className="text-slate-500 text-sm">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase">
                  <th className="text-left pb-3 font-semibold">Kind</th>
                  <th className="text-left pb-3 font-semibold">Filename</th>
                  <th className="text-left pb-3 font-semibold">Rows</th>
                  <th className="text-left pb-3 font-semibold">By</th>
                  <th className="text-left pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentImports.map(ib => (
                  <tr key={ib.id}>
                    <td className="py-3 text-white font-medium capitalize">{ib.kind}</td>
                    <td className="py-3 text-slate-300">{ib.filename}</td>
                    <td className="py-3 text-slate-300">{ib.row_count}</td>
                    <td className="py-3 text-slate-300">{ib.user_name || 'Unknown'}</td>
                    <td className="py-3 text-slate-400 text-xs">{new Date(ib.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
