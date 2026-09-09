import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flame,
  Image as ImageIcon,
  Info,
  RefreshCw,
  Tag,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { COURTS } from '../data/siteConfig'
import { PRICING, calculatePrice, perSessionRate } from '../data/pricingData'

const ALL_TIMES = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']

const timeLabels = {
  '14:00': '2:00–3:00', '15:00': '3:00–4:00', '16:00': '4:00–5:00',
  '17:00': '5:00–6:00', '18:00': '6:00–7:00', '19:00': '7:00–8:00',
  '20:00': '8:00–9:00', '21:00': '9:00–10:00', '22:00': '10:00–11:00',
  '23:00': '11:00–12:00',
}

const SESSION_TYPES = [
  { value: 'private', label: 'Private Coaching', sub: '1-on-1 Personalised Coaching', tag: '1,000 / 3,600 / 7,000 EGP' },
  { value: 'group', label: 'Group Class', sub: 'Tactical Clinic Training', tag: '500 / 1,800 / 3,500 EGP' },
]

const DAY_OPTIONS = [
  { key: 'sunday', label: 'Sun', name: 'Sunday' },
  { key: 'monday', label: 'Mon', name: 'Monday' },
  { key: 'tuesday', label: 'Tue', name: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', name: 'Wednesday' },
  { key: 'thursday', label: 'Thu', name: 'Thursday' },
]

export default function Book() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [bookedMap, setBookedMap] = useState(() => new Map())
  const [loadingSlots, setLoadingSlots] = useState(true)

  const [mode, setMode] = useState('day')
  const [sessionType, setSessionType] = useState('')
  const [showFlyerModal, setShowFlyerModal] = useState(false)

  const [daySelectedDate, setDaySelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [daySelections, setDaySelections] = useState(() => new Map())

  const [weekStartDate, setWeekStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weekDays, setWeekDays] = useState([])
  const [weekTime, setWeekTime] = useState('')
  const [weekWeeks, setWeekWeeks] = useState(1)

  const fetchSlots = () => {
    setLoadingSlots(true)
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 12 * 7)

    api.get(`/slots?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}`)
      .then(slots => {
        const map = new Map()
        for (const s of slots) {
          if (s.player_text && s.player_text.trim()) {
            map.set(`${s.date}|${s.time}|${s.court}`, s.player_text)
          }
        }
        setBookedMap(map)
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false))
  }

  useEffect(() => { fetchSlots() }, [])

  const isTimeBooked = (date, time, court) => bookedMap.has(`${date}|${time}|${court}`)

  const toggleDaySelection = (time, court) => {
    const key = `${time}|${court}`
    const next = new Map(daySelections)
    if (next.has(key)) next.delete(key)
    else next.set(key, { time, court })
    setDaySelections(next)
  }

  const toggleWeekDay = (key) => {
    setWeekDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]))
  }

  const daySessions = useMemo(
    () => mode === 'day'
      ? [...daySelections.values()].map((sel) => ({
          time: sel.time,
          court: sel.court,
          date: daySelectedDate,
          label: `${daySelectedDate} · ${timeLabels[sel.time]} · Court ${sel.court}`,
        }))
      : [],
    [mode, daySelections, daySelectedDate]
  )

  const weekSessions = useMemo(() => {
    if (mode !== 'week' || !weekTime || weekDays.length === 0) return []
    const sessions = []
    for (let w = 0; w < weekWeeks; w++) {
      for (const dayKey of weekDays) {
        const idx = DAY_OPTIONS.findIndex((d) => d.key === dayKey)
        const base = new Date(`${weekStartDate}T00:00:00`)
        const date = new Date(base)
        date.setDate(base.getDate() + w * 7 + idx)
        const dateStr = date.toISOString().slice(0, 10)
        sessions.push({
          date: dateStr,
          time: weekTime,
          court: 1,
          label: `${dateStr} · ${timeLabels[weekTime]} · ${dayKey[0].toUpperCase() + dayKey.slice(1)}`,
        })
      }
    }
    return sessions
  }, [mode, weekTime, weekDays, weekWeeks, weekStartDate])

  const activeSessions = mode === 'day' ? daySessions : weekSessions
  const sessionCount = activeSessions.length
  const totalPrice = calculatePrice(sessionType, sessionCount)
  const canContinue = sessionType && sessionCount > 0

  const handleContinue = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate('/payment', {
      state: { sessionType, mode, sessions: activeSessions, totalPrice, sessionCount },
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-10 left-1/4 w-[500px] h-[300px] bg-lime-500/10 rounded-full blur-[140px] pointer-events-none" />

      {showFlyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-2xl w-full max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-2 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-heading font-extrabold text-white text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-lime-400" />
                <span>Official MM Padel Academy Pricing Flyer</span>
              </h3>
              <button onClick={() => setShowFlyerModal(false)} className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300">Close ✕</button>
            </div>
            <div className="overflow-auto p-2 flex justify-center">
              <img src="/images/pricing.jpg" alt="MM Padel Academy Official Pricing" className="rounded-2xl max-h-[75vh] object-contain shadow-2xl" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-widest">
            <Flame className="w-4 h-4" />
            <span>Official Academy Training Packages</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white">Book Your Training Package</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            1 Hour Sessions • Prices are Per Player • {COURTS} Courts • Training Days: Sunday – Thursday (3:00 PM – 11:00 PM)
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button onClick={() => setShowFlyerModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-lime-400 font-bold text-xs border border-lime-400/40 shadow-md transition-all">
              <ImageIcon className="w-4 h-4" /><span>View Official Pricing Flyer</span>
            </button>
            <button onClick={fetchSlots} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 transition-all">
              <RefreshCw className={`w-4 h-4 ${loadingSlots ? 'animate-spin' : ''}`} /><span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-bold text-sm">1</div>
                <h3 className="font-heading text-xl font-extrabold text-white">Select Session Category</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {SESSION_TYPES.map((item) => {
                  const selected = sessionType === item.value
                  return (
                    <div key={item.value} onClick={() => setSessionType(item.value)} className={`p-5 rounded-2xl cursor-pointer border transition-all ${selected ? 'bg-lime-400/10 border-lime-400 ring-1 ring-lime-400' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-base">{item.label}</span>
                        {selected && <CheckCircle2 className="w-5 h-5 text-lime-400" />}
                      </div>
                      <span className="text-xs text-lime-400 font-bold block mb-1">{item.tag}</span>
                      <p className="text-xs text-slate-400">{item.sub}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-bold text-sm">2</div>
                <h3 className="font-heading text-xl font-extrabold text-white">Schedule Your Sessions</h3>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-lime-400 shrink-0" />
                  <div>
                    <span className="text-white font-bold block">Official Training Days</span>
                    <span className="text-slate-400">Sunday – Thursday</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4 text-lime-400" />
                  <span>3:00 PM – 11:00 PM</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setMode('day')} className={`p-3.5 rounded-xl border text-xs font-bold transition-all ${mode === 'day' ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                  Per Day Booking
                </button>
                <button onClick={() => setMode('week')} className={`p-3.5 rounded-xl border text-xs font-bold transition-all ${mode === 'week' ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                  Per Week Schedule
                </button>
              </div>

              {loadingSlots ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : mode === 'day' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Date</label>
                    <input type="date" value={daySelectedDate} onChange={(e) => setDaySelectedDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-lime-400" />
                  </div>
                  <p className="text-xs text-slate-500">Greyed-out slots are already booked. Tap any available time + court.</p>
                  <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <div className="grid grid-cols-3 bg-slate-900/80 text-center">
                      <div className="px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-400 text-left">Time</div>
                      <div className="px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-lime-400 border-l border-slate-800">Court 1</div>
                      <div className="px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-lime-400 border-l border-slate-800">Court 2</div>
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {ALL_TIMES.map((time) => (
                        <div key={time} className="grid grid-cols-3 items-stretch">
                          <div className="px-3 py-2 text-slate-300 font-mono text-[11px] flex items-center bg-slate-900/40">{timeLabels[time]}</div>
                          {[1, 2].map((court) => {
                            const booked = isTimeBooked(daySelectedDate, time, court)
                            const selected = daySelections.has(`${time}|${court}`)
                            return (
                              <div key={court} className="px-2 py-1.5 border-l border-slate-800/60">
                                {booked ? (
                                  <div className="px-3 py-2 rounded-xl bg-slate-900/40 text-slate-600 border border-slate-800/40 text-center text-xs font-bold line-through">Booked</div>
                                ) : (
                                  <button onClick={() => toggleDaySelection(time, court)} className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition-all ${selected ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-400/20' : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-lime-400/60'}`}>
                                    {selected ? 'Selected ✓' : 'Select'}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Start Date</label>
                    <input type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-lime-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Days of the Week (Sun – Thu)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {DAY_OPTIONS.map((d) => {
                        const checked = weekDays.includes(d.key)
                        return (
                          <button key={d.key} onClick={() => toggleWeekDay(d.key)} className={`p-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${checked ? 'bg-lime-400/20 text-lime-400 border-lime-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                            <span>{d.label}</span>
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Time Slot</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_TIMES.map((time) => (
                        <button key={time} onClick={() => setWeekTime(time)} className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${weekTime === time ? 'bg-lime-400 text-slate-950 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-lime-400/60'}`}>
                          {timeLabels[time]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Number of Weeks</label>
                    <div className="inline-flex rounded-xl overflow-hidden border border-slate-700">
                      <button onClick={() => setWeekWeeks((w) => Math.max(1, w - 1))} className="px-4 py-2 text-lime-400 font-bold bg-slate-900" aria-label="Decrease weeks">−</button>
                      <span className="px-5 py-2 text-center font-bold text-white bg-slate-900 min-w-12">{weekWeeks}</span>
                      <button onClick={() => setWeekWeeks((w) => Math.min(12, w + 1))} className="px-4 py-2 text-lime-400 font-bold bg-slate-900" aria-label="Increase weeks">+</button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Total sessions: {weekDays.length * weekWeeks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-28 glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="font-heading text-lg font-extrabold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-lime-400" /><span>Your Booking</span>
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 uppercase">Live estimate</span>
              </div>

              {!sessionType ? (
                <p className="text-xs text-slate-500">Select a session category to begin.</p>
              ) : sessionCount === 0 ? (
                <p className="text-xs text-slate-500">No sessions selected yet.</p>
              ) : (
                <>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1"><span className="text-slate-400">Category:</span><span className="text-white font-bold">{PRICING[sessionType].name}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-400">Sessions:</span><span className="text-lime-400 font-bold">{sessionCount}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-400">Rate / session:</span><span className="text-slate-200 font-semibold">{perSessionRate(sessionType, sessionCount).toLocaleString()} EGP</span></div>
                  </div>

                  <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {activeSessions.map((s, i) => (
                      <li key={i} className="text-[11px] text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">{s.label}</li>
                    ))}
                  </ul>

                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs font-bold text-white block">Total Amount</span>
                        <span className="text-[10px] text-slate-400 font-medium">Per player • 1-hour sessions</span>
                      </div>
                      <div className="text-right">
                        <span className="font-heading text-3xl font-black text-lime-400">{totalPrice.toLocaleString()}</span>
                        <span className="text-xs font-bold text-white ml-1">EGP</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={handleContinue} disabled={!canContinue} className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm shadow-xl shadow-lime-400/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50">
                    <span>{user ? `Continue to Payment (${totalPrice.toLocaleString()} EGP)` : 'Login to Continue'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Passes directly to InstaPay Checkout</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
