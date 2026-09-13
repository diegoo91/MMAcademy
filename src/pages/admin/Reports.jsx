import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, DollarSign, TrendingUp, Users } from 'lucide-react'
import { api } from '../../lib/api'

function DateRangeSelector({ preset, setPreset, from, setFrom, to, setTo }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'custom', label: 'Custom' },
        ].map(opt => (
          <button key={opt.id} onClick={() => setPreset(opt.id)} className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all ${
            preset === opt.id ? 'bg-lime-400 text-slate-950 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}>
            {opt.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <>
          <div className="flex gap-2 items-center">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">From:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-lime-400" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">To:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-lime-400" />
          </div>
        </>
      )}
    </div>
  )
}

export default function Reports() {
  const [preset, setPreset] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('preset', preset)
    if (preset === 'custom') {
      if (from) params.set('from', from)
      if (to) params.set('to', to)
    }
    api.get(`/reports/summary?${params}`).then(setData).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchReport() }, [preset, from, to])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-black text-slate-900 dark:text-white">Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Financial and operational overview</p>
      </div>

      <DateRangeSelector preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">Failed to load report data.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-emerald-400/10"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Revenue</span>
              </div>
              <p className="font-heading text-2xl font-black text-slate-900 dark:text-white">EGP {data.profit.revenue.toLocaleString()}</p>
            </div>
            <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-rose-400/10"><DollarSign className="w-5 h-5 text-rose-400" /></div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Expenses</span>
              </div>
              <p className="font-heading text-2xl font-black text-slate-900 dark:text-white">EGP {data.profit.expenses.toLocaleString()}</p>
            </div>
            <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-lime-400/10"><TrendingUp className="w-5 h-5 text-lime-400" /></div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Net Profit</span>
              </div>
              <p className={`font-heading text-2xl font-black ${data.profit.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-400'}`}>EGP {data.profit.net.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-lime-400" /> Past Payments
              </h3>
              {data.payments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No payments in this period.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                      <tr className="text-slate-500 dark:text-slate-400 uppercase">
                        <th className="text-left px-3 py-2 font-semibold">Date</th>
                        <th className="text-left px-3 py-2 font-semibold">Player</th>
                        <th className="text-left px-3 py-2 font-semibold">Type</th>
                        <th className="text-right px-3 py-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                      {data.payments.map((p, i) => (
                        <tr key={i} className="text-slate-700 dark:text-slate-300">
                          <td className="px-3 py-2">{p.date}</td>
                          <td className="px-3 py-2 font-semibold">{p.player}</td>
                          <td className="px-3 py-2"><span className="text-[10px] font-bold uppercase">{p.session_type}</span></td>
                          <td className="px-3 py-2 text-right font-bold">EGP {p.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-lime-400" /> Sessions per Player
              </h3>
              {data.sessionsPerPlayer.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No sessions in this period.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {data.sessionsPerPlayer.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-xs">{p.name.charAt(0)}</div>
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{p.name}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 text-xs font-bold">{p.sessions} sessions</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-lime-400" /> Schedule History
            </h3>
            {data.scheduleHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No schedule data in this period.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400 uppercase">
                      <th className="text-left px-3 py-2 font-semibold">Date</th>
                      <th className="text-left px-3 py-2 font-semibold">Time</th>
                      <th className="text-left px-3 py-2 font-semibold">Court</th>
                      <th className="text-left px-3 py-2 font-semibold">Player</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {data.scheduleHistory.slice(0, 50).map((s, i) => (
                      <tr key={i} className="text-slate-700 dark:text-slate-300">
                        <td className="px-3 py-2">{s.date}</td>
                        <td className="px-3 py-2 font-mono">{s.time}</td>
                        <td className="px-3 py-2">Court {s.court}</td>
                        <td className="px-3 py-2 font-semibold">{s.player_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
