import { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'

const TIME_LABELS = {
  '14:00': '2:00–3:00', '15:00': '3:00–4:00', '16:00': '4:00–5:00',
  '17:00': '5:00–6:00', '18:00': '6:00–7:00', '19:00': '7:00–8:00',
  '20:00': '8:00–9:00', '21:00': '9:00–10:00', '22:00': '10:00–11:00',
  '23:00': '11:00–12:00',
}
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ALL_TIMES = ['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']

function formatDateShort(d) { const [,m,day] = d.split('-'); return `${Number(day)}/${Number(m)}` }
function getDayName(d) { return DAY_NAMES[new Date(d + 'T00:00:00').getDay()] }

export default function ScheduleManager() {
  const [view, setView] = useState('day')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [editSlot, setEditSlot] = useState(null)
  const [addSlot, setAddSlot] = useState(null)
  const [addForm, setAddForm] = useState({ date: '', time: '15:00', court: 1, player_text: '' })

  const fetchSlots = () => {
    setLoading(true)
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 14)
    api.get(`/slots?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}`)
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots() }, [])

  const slotsByDate = useMemo(() => {
    const map = new Map()
    for (const s of slots) {
      if (!map.has(s.date)) map.set(s.date, [])
      map.get(s.date).push(s)
    }
    return map
  }, [slots])

  const availableDates = useMemo(() => [...slotsByDate.keys()].sort(), [slotsByDate])
  const weekDates = useMemo(() => availableDates.slice(0, 5), [availableDates])
  const weekTimes = useMemo(() => {
    const set = new Set()
    for (const s of slots) set.add(s.time)
    return [...set].sort()
  }, [slots])

  const currentDaySlots = useMemo(() => {
    const daySlots = slotsByDate.get(date) || []
    const times = [...new Set(daySlots.map(s => s.time))].sort()
    return times.map(time => {
      const c1 = daySlots.find(s => s.time === time && s.court === 1)
      const c2 = daySlots.find(s => s.time === time && s.court === 2)
      return { time, label: TIME_LABELS[time] || time, slot1: c1 || null, slot2: c2 || null }
    })
  }, [date, slotsByDate])

  const handleDeleteSlot = async (id) => {
    try { await api.del(`/slots/${id}`); fetchSlots() } catch {}
  }

  const handleAddSlot = async () => {
    try {
      await api.post('/slots', addForm)
      setAddSlot(null)
      setAddForm({ date: '', time: '15:00', court: 1, player_text: '' })
      fetchSlots()
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-black text-slate-900 dark:text-white">Schedule Manager</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Edit, add, or delete court slots</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button onClick={() => setView('day')} className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${view === 'day' ? 'bg-lime-400 text-slate-950 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
            <CalendarIcon className="w-4 h-4" /><span>Day View</span>
          </button>
          <button onClick={() => setView('week')} className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${view === 'week' ? 'bg-lime-400 text-slate-950 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
            <CalendarIcon className="w-4 h-4" /><span>Week View</span>
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-lime-400" />
          <button onClick={() => { setAddSlot(true); setAddForm({ ...addForm, date }) }} className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Slot
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'day' ? (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
            <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg">{getDayName(date)} {formatDateShort(date)}</h3>
            <span className="text-xs text-lime-400 font-bold bg-lime-400/10 px-3 py-1 rounded-full border border-lime-400/30">2 Courts</span>
          </div>
          {currentDaySlots.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No slots for this date.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="min-w-[320px]">
                <div className="grid grid-cols-4 bg-slate-100/80 dark:bg-slate-900/80 text-center">
                  <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">Time</div>
                  <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-lime-400 border-l border-slate-200 dark:border-slate-800">Court 1</div>
                  <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-lime-400 border-l border-slate-200 dark:border-slate-800">Court 2</div>
                  <div className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">Actions</div>
                </div>
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {currentDaySlots.map((row) => (
                    <div key={row.time} className="grid grid-cols-4 items-stretch text-sm">
                      <div className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs flex items-center gap-1.5 bg-slate-50/40 dark:bg-slate-900/40">
                        <Clock className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                        {row.label}
                      </div>
                      {[row.slot1, row.slot2].map((slot, i) => (
                        <div key={i} className={`px-4 py-3 border-l border-slate-200/60 dark:border-slate-800/60 text-xs font-bold text-center flex items-center justify-center gap-2 ${slot ? 'bg-rose-500/10 text-rose-300' : 'bg-lime-400/5 text-lime-400'}`}>
                          {slot ? (
                            <>
                              <span className="truncate">{slot.player_text}</span>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setEditSlot(slot)} className="p-0.5 text-slate-400 hover:text-blue-400" title="Edit"><CalendarIcon className="w-3 h-3" /></button>
                                <button onClick={() => handleDeleteSlot(slot.id)} className="p-0.5 text-slate-400 hover:text-rose-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </>
                          ) : 'Available'}
                        </div>
                      ))}
                      <div className="px-2 py-3 border-l border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center gap-1">
                        {[1, 2].map(court => {
                          const exists = court === 1 ? row.slot1 : row.slot2
                          if (exists) return null
                          return (
                            <button key={court} onClick={() => { setAddSlot(true); setAddForm({ ...addForm, date, time: row.time, court }) }} className="px-2 py-1 text-[10px] font-bold rounded bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 border border-lime-400/30">
                              +C{court}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-6 gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 text-center font-heading text-sm font-extrabold text-slate-900 dark:text-white">
              <div className="text-left text-slate-500 dark:text-slate-400 text-xs uppercase">Time</div>
              {weekDates.map(d => (
                <div key={d} className="text-lime-400 text-xs">{getDayName(d)} ({formatDateShort(d)})</div>
              ))}
            </div>
            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 pt-2 space-y-2">
              {weekTimes.map(time => (
                <div key={time} className="grid grid-cols-6 gap-3 py-2 items-center text-xs">
                  <div className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-lime-400" />
                    <span>{TIME_LABELS[time] || time}</span>
                  </div>
                  {weekDates.map(d => {
                    const daySlots = slotsByDate.get(d) || []
                    const s1 = daySlots.find(x => x.time === time && x.court === 1)
                    const s2 = daySlots.find(x => x.time === time && x.court === 2)
                    const empty = !s1 && !s2
                    return (
                      <div key={d} className={`p-2.5 rounded-xl border text-[11px] font-bold text-center leading-snug ${empty ? 'bg-slate-50/40 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border-slate-200/40 dark:border-slate-800/40' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'}`}>
                        {empty ? (
                          <button onClick={() => { setAddSlot(true); setAddForm({ ...addForm, date: d, time }) }} className="text-lime-400 hover:underline">+ Add</button>
                        ) : (
                          <span className="block">{s1 && s2 ? `C1: ${s1.player_text} / C2: ${s2.player_text}` : s1 ? `C1: ${s1.player_text}` : `C2: ${s2.player_text}`}</span>
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

      {addSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Slot</h3>
              <button onClick={() => setAddSlot(null)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Date</label>
                <input type="date" value={addForm.date} onChange={e => setAddForm({ ...addForm, date: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Time</label>
                <select value={addForm.time} onChange={e => setAddForm({ ...addForm, time: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs">
                  {ALL_TIMES.map(t => <option key={t} value={t}>{TIME_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Court</label>
                <select value={addForm.court} onChange={e => setAddForm({ ...addForm, court: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs">
                  <option value={1}>Court 1</option>
                  <option value={2}>Court 2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Player Name</label>
                <input type="text" value={addForm.player_text} onChange={e => setAddForm({ ...addForm, player_text: e.target.value })} placeholder="e.g. Zain" className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAddSlot(null)} className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold">Cancel</button>
              <button onClick={handleAddSlot} className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm">Add</button>
            </div>
          </div>
        </div>
      )}

      {editSlot && (
        <EditSlotModal slot={editSlot} onClose={() => setEditSlot(null)} onSaved={() => { setEditSlot(null); fetchSlots() }} />
      )}
    </div>
  )
}

function EditSlotModal({ slot, onClose, onSaved }) {
  const [form, setForm] = useState({ player_text: slot.player_text || '', date: slot.date, time: slot.time, court: slot.court })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put(`/slots/${slot.id}`, form)
      onSaved()
    } catch {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-sm glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Slot</h3>
          <button onClick={onClose} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Player Name</label>
            <input type="text" value={form.player_text} onChange={e => setForm({ ...form, player_text: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Time</label>
            <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs">
              {ALL_TIMES.map(t => <option key={t} value={t}>{TIME_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Court</label>
            <select value={form.court} onChange={e => setForm({ ...form, court: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs">
              <option value={1}>Court 1</option>
              <option value={2}>Court 2</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
