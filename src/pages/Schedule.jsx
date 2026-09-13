import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flame,
  Grid,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'
import { COURTS } from '../data/siteConfig'

const TIME_LABELS = {
  '14:00': '2:00–3:00', '15:00': '3:00–4:00', '16:00': '4:00–5:00',
  '17:00': '5:00–6:00', '18:00': '6:00–7:00', '19:00': '7:00–8:00',
  '20:00': '8:00–9:00', '21:00': '9:00–10:00', '22:00': '10:00–11:00',
  '23:00': '11:00–12:00',
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function groupSlotsByDate(slots) {
  const map = new Map()
  for (const s of slots) {
    if (!map.has(s.date)) map.set(s.date, [])
    map.get(s.date).push(s)
  }
  return map
}

function buildDaySlots(date, daySlots) {
  const times = [...new Set(daySlots.map(s => s.time))].sort()
  return times.map(time => {
    const c1 = daySlots.find(s => s.time === time && s.court === 1)
    const c2 = daySlots.find(s => s.time === time && s.court === 2)
    return {
      time,
      label: TIME_LABELS[time] || time,
      court1: c1?.player_text || '',
      court2: c2?.player_text || '',
    }
  })
}

function formatDateShort(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${Number(d)}/${Number(m)}`
}

function getDayName(dateStr) {
  const dt = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[dt.getDay()]
}

export default function Schedule() {
  const [scheduleView, setScheduleView] = useState('day')
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [showFlyerModal, setShowFlyerModal] = useState(false)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSlots = () => {
    setLoading(true)
    setError('')
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const from = weekStart.toISOString().slice(0, 10)
    const to = weekEnd.toISOString().slice(0, 10)

    api.get(`/slots?from=${from}&to=${to}`)
      .then(setSlots)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots() }, [])

  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots])

  const availableDates = useMemo(() => {
    return [...slotsByDate.keys()].sort()
  }, [slotsByDate])

  const dateChips = useMemo(() => {
    return availableDates.map(d => ({
      date: d,
      label: `${getDayName(d)} ${formatDateShort(d)}`,
    }))
  }, [availableDates])

  const currentDaySlots = useMemo(() => {
    const daySlots = slotsByDate.get(scheduleDate) || []
    return buildDaySlots(scheduleDate, daySlots)
  }, [scheduleDate, slotsByDate])

  const weekTimes = useMemo(() => {
    const set = new Set()
    for (const s of slots) set.add(s.time)
    return [...set].sort()
  }, [slots])

  const weekDates = useMemo(() => {
    return availableDates.slice(0, 5)
  }, [availableDates])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-10 left-1/4 w-[500px] h-[300px] bg-lime-500/10 rounded-full blur-[140px] pointer-events-none" />

      {showFlyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-2xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 p-2 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-lime-400" />
                <span>Official MM Padel Academy Pricing Flyer</span>
              </h3>
              <button onClick={() => setShowFlyerModal(false)} className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">Close ✕</button>
            </div>
            <div className="overflow-auto p-2 flex justify-center">
              <img src="/images/pricing.jpg" alt="MM Padel Academy Official Pricing" className="rounded-2xl max-h-[75vh] object-contain shadow-2xl" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-widest">
            <Flame className="w-4 h-4" />
            <span>Official Court Availability &amp; Schedule</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">Academy Booking Schedule</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
            Sunday to Thursday • 3:00 PM to 11:00 PM • {COURTS} courts • All sessions 1 hour • Live from server.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button onClick={() => setShowFlyerModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-lime-400 font-bold text-xs border border-lime-400/40 shadow-md transition-all">
              <ImageIcon className="w-4 h-4" />
              <span>View Official Pricing Flyer</span>
            </button>
            <button onClick={fetchSlots} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-rose-400 text-sm mb-4">{error}</p>
            <button onClick={fetchSlots} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold">Retry</button>
          </div>
        ) : (
          <>
            {dateChips.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mr-2">Quick Dates:</span>
                {dateChips.map((chip) => (
                  <button
                    key={chip.date}
                    onClick={() => { setScheduleDate(chip.date); setScheduleView('day') }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      scheduleDate === chip.date && scheduleView === 'day'
                        ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-400/20'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setScheduleView('day')} className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${scheduleView === 'day' ? 'bg-lime-400 text-slate-950 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  <CalendarIcon className="w-4 h-4" /><span>Day view (2 Courts)</span>
                </button>
                <button onClick={() => setScheduleView('week')} className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${scheduleView === 'week' ? 'bg-lime-400 text-slate-950 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  <Grid className="w-4 h-4" /><span>Week view</span>
                </button>
              </div>

              {scheduleView === 'day' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date:</label>
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-lime-400" />
                </div>
              )}

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-lime-400" /><span className="text-slate-700 dark:text-slate-300">Available</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-slate-700 dark:text-slate-300">Booked</span></div>
              </div>
            </div>

            {scheduleView === 'day' ? (
              <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 mb-8">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-lime-400" />
                    <span>{getDayName(scheduleDate)} {formatDateShort(scheduleDate)}</span>
                  </h3>
                  <span className="text-xs text-lime-400 font-bold bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/30">2 Courts • Live</span>
                </div>

                {currentDaySlots.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No slots scheduled for this date — both courts are free all evening.</p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-3 bg-white/80 dark:bg-slate-900/80 text-center">
                      <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">Time</div>
                      <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-lime-400 border-l border-slate-200 dark:border-slate-800">Court 1</div>
                      <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-lime-400 border-l border-slate-200 dark:border-slate-800">Court 2</div>
                    </div>
                    <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                      {currentDaySlots.map((slot) => (
                        <div key={slot.time} className="grid grid-cols-3 items-stretch text-sm">
                          <div className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center gap-1.5 bg-white/40 dark:bg-slate-900/40">
                            <Clock className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                            {slot.label}
                          </div>
                          {[slot.court1, slot.court2].map((player, i) => (
                            <div key={i} className={`px-4 py-3 border-l border-slate-200/60 dark:border-slate-800/60 text-xs font-bold text-center flex items-center justify-center ${player ? 'bg-rose-500/10 text-rose-300' : 'bg-lime-400/5 text-lime-400'}`}>
                              {player || 'Available'}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 overflow-x-auto mb-8">
                <div className="min-w-[850px]">
                  <div className="grid grid-cols-6 gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 text-center font-heading text-sm font-extrabold text-slate-900 dark:text-white">
                    <div className="text-left text-slate-500 dark:text-slate-400 text-xs uppercase">Time Slot</div>
                    {weekDates.map(date => (
                      <div key={date} className="text-lime-400 text-xs">{getDayName(date)} ({formatDateShort(date)})</div>
                    ))}
                  </div>
                  <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 pt-2 space-y-2">
                    {weekTimes.map(time => (
                      <div key={time} className="grid grid-cols-6 gap-3 py-2 items-center text-xs">
                        <div className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-lime-400" />
                          <span>{TIME_LABELS[time] || time}</span>
                        </div>
                        {weekDates.map(date => {
                          const daySlots = slotsByDate.get(date) || []
                          const s = daySlots.find(x => x.time === time && x.court === 1)
                          const s2 = daySlots.find(x => x.time === time && x.court === 2)
                          const c1 = s?.player_text || ''
                          const c2 = s2?.player_text || ''
                          const empty = !c1 && !c2
                          return (
                            <div key={date} className={`p-2.5 rounded-xl border text-[11px] font-bold text-center leading-snug ${empty ? 'bg-white/40 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border-slate-200/40 dark:border-slate-800/40' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'}`}>
                              {empty ? 'Available' : (
                                <span className="block">{c1 && c2 ? `C1: ${c1} / C2: ${c2}` : c1 ? `C1: ${c1}` : `C2: ${c2}`}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="p-6 rounded-3xl bg-gradient-to-r from-lime-500/10 via-white dark:via-slate-900 to-white dark:to-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-lime-400 text-slate-950 font-bold"><CheckCircle2 className="w-6 h-6 stroke-[2.5]" /></div>
            <div>
              <h4 className="font-heading font-extrabold text-slate-900 dark:text-white text-base">Found an open slot?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Head to booking and lock in your 1-hour session.</p>
            </div>
          </div>
          <Link to="/book" className="px-6 py-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-lime-400/20 transition-all flex items-center gap-2 shrink-0">
            <span>Proceed to Book a Session</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
