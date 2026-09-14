import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Search, Eye, X, Trash2, Edit3, ArrowRightLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const TIME_LABELS = {
  '14:00': '2:00–3:00', '15:00': '3:00–4:00', '16:00': '4:00–5:00',
  '17:00': '5:00–6:00', '18:00': '6:00–7:00', '19:00': '7:00–8:00',
  '20:00': '8:00–9:00', '21:00': '9:00–10:00', '22:00': '10:00–11:00',
  '23:00': '11:00–12:00',
}

export default function Bookings() {
  const { isAdmin } = useAuth()
  const canEdit = isAdmin
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [viewBooking, setViewBooking] = useState(null)
  const [editBooking, setEditBooking] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [convertBooking, setConvertBooking] = useState(null)
  const [convertForm, setConvertForm] = useState({ direction: 'private_to_group', count: 1 })
  const [convertError, setConvertError] = useState('')
  const [pendingBookingRequests, setPendingBookingRequests] = useState([])
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [slotFilterDate, setSlotFilterDate] = useState(tomorrow.toISOString().split('T')[0])
  const [pendingSlots, setPendingSlots] = useState([])
  const [changeTimeSlot, setChangeTimeSlot] = useState(null)
  const [changeTimeForm, setChangeTimeForm] = useState({ date: '', time: '15:00', court: 1 })
  const [slotActionMsg, setSlotActionMsg] = useState(null)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const data = await api.get(`/bookings${params}`)
      setBookings(data.bookings || [])
    } catch {}
    setLoading(false)
  }

  const fetchPendingRequests = () => {
    api.get('/booking-requests?kind=new_booking&status=pending')
      .then(data => setPendingBookingRequests(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  const fetchPendingSlots = () => {
    api.get(`/slots?from=${slotFilterDate}&to=${slotFilterDate}`)
      .then(data => {
        setPendingSlots(Array.isArray(data) ? data.filter(s => s.status === 'pending') : [])
      })
      .catch(() => {})
  }

  useEffect(() => { fetchBookings(); fetchPendingRequests() }, [filter])
  useEffect(() => { fetchPendingSlots() }, [slotFilterDate])

  const handleSlotApprove = async (slotId) => {
    try {
      const requests = await api.get(`/booking-requests?slot_id=${slotId}&status=pending`)
      const req = (Array.isArray(requests) ? requests : []).find(r => r.kind === 'new_booking')
      if (req) {
        await api.put(`/booking-requests/${req.id}/decide`, { decision: 'approved' })
        setSlotActionMsg({ type: 'success', text: 'Slot approved' })
        setTimeout(() => setSlotActionMsg(null), 2000)
        fetchPendingSlots()
        fetchPendingRequests()
        fetchBookings()
      }
    } catch (err) {
      setSlotActionMsg({ type: 'error', text: err.message || 'Failed' })
      setTimeout(() => setSlotActionMsg(null), 2000)
    }
  }

  const handleSlotDeny = async (slotId) => {
    try {
      const requests = await api.get(`/booking-requests?slot_id=${slotId}&status=pending`)
      const req = (Array.isArray(requests) ? requests : []).find(r => r.kind === 'new_booking')
      if (req) {
        await api.put(`/booking-requests/${req.id}/decide`, { decision: 'denied' })
        setSlotActionMsg({ type: 'success', text: 'Slot denied' })
        setTimeout(() => setSlotActionMsg(null), 2000)
        fetchPendingSlots()
        fetchPendingRequests()
        fetchBookings()
      }
    } catch (err) {
      setSlotActionMsg({ type: 'error', text: err.message || 'Failed' })
      setTimeout(() => setSlotActionMsg(null), 2000)
    }
  }

  const handleSlotChangeTime = async () => {
    if (!changeTimeSlot) return
    try {
      await api.put(`/slots/${changeTimeSlot.id}`, {
        date: changeTimeForm.date,
        time: changeTimeForm.time,
        court: changeTimeForm.court,
      })
      setChangeTimeSlot(null)
      setSlotActionMsg({ type: 'success', text: 'Time updated' })
      setTimeout(() => setSlotActionMsg(null), 2000)
      fetchPendingSlots()
    } catch (err) {
      setSlotActionMsg({ type: 'error', text: err.message || 'Failed' })
      setTimeout(() => setSlotActionMsg(null), 2000)
    }
  }

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status })
      fetchBookings()
    } catch {}
  }

  const handleRequestDecide = async (requestId, decision) => {
    try {
      await api.put(`/booking-requests/${requestId}/decide`, { decision })
      fetchPendingRequests()
      fetchBookings()
    } catch {}
  }

  const handleDelete = async (id) => {
    try {
      await api.del(`/bookings/${id}`)
      setDeleteConfirm(null)
      fetchBookings()
    } catch {}
  }

  const handleConvert = async () => {
    if (!convertBooking) return
    setConvertError('')
    try {
      const count = parseInt(convertForm.count) || 0
      if (count <= 0) { setConvertError('Count must be at least 1'); return }
      if (convertForm.direction === 'private_to_group') {
        if (count > (convertBooking.private_remaining || 0)) {
          setConvertError(`Only ${convertBooking.private_remaining || 0} private credits available`)
          return
        }
      } else {
        if (count * 2 > (convertBooking.group_remaining || 0)) {
          setConvertError(`Only ${convertBooking.group_remaining || 0} group credits available (need ${count * 2})`)
          return
        }
      }
      const payload = convertForm.direction === 'private_to_group'
        ? { from: 'private', to: 'group', count }
        : { from: 'group', to: 'private', count }
      await api.put(`/bookings/${convertBooking.id}/convert`, payload)
      setConvertBooking(null)
      setConvertForm({ direction: 'private_to_group', count: 1 })
      fetchBookings()
    } catch (err) {
      setConvertError(err.message || 'Conversion failed')
    }
  }

  const filtered = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (b.ref || '').toLowerCase().includes(q) ||
           (b.user_name || '').toLowerCase().includes(q) ||
           (b.player_name || '').toLowerCase().includes(q)
  })

  const statusColors = {
    pending: 'bg-amber-400/20 text-amber-400 border-amber-400/40',
    confirmed: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/40',
    cancelled: 'bg-rose-400/20 text-rose-400 border-rose-400/40',
    completed: 'bg-slate-400/20 text-slate-400 border-slate-400/40',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-black text-theme">Bookings</h1>
        <p className="text-muted text-sm mt-1">Review and confirm player bookings</p>
      </div>

      {canEdit && (
        <div className="glass-panel rounded-2xl border border-theme p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold text-theme">Pending Slots for Date</h2>
            <input type="date" value={slotFilterDate} onChange={e => setSlotFilterDate(e.target.value)} className="px-3 py-1.5 rounded-xl bg-surface border border-theme text-theme text-xs font-bold" />
          </div>
          {slotActionMsg && (
            <div className={`mb-3 p-2 rounded-lg text-xs font-semibold ${slotActionMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
              {slotActionMsg.text}
            </div>
          )}
          {pendingSlots.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No pending slots for this date.</p>
          ) : (
            <div className="space-y-2">
              {pendingSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-400 border border-amber-400/40">PENDING</span>
                    <span className="text-sm font-semibold text-theme">{slot.player_text}</span>
                    <span className="text-xs text-muted">{slot.date} · {TIME_LABELS[slot.time] || slot.time} · Court {slot.court}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSlotApprove(slot.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleSlotDeny(slot.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Deny
                    </button>
                    <button onClick={() => { setChangeTimeSlot(slot); setChangeTimeForm({ date: slot.date, time: slot.time, court: slot.court }) }} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Change Time
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === s ? 'bg-lime-400 text-slate-950' : 'bg-surface border border-theme text-theme hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" placeholder="Search ref or name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">No bookings found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-theme text-muted">
                <th className="text-left py-3 px-3 font-semibold">Ref</th>
                <th className="text-left py-3 px-3 font-semibold">Player</th>
                <th className="text-left py-3 px-3 font-semibold">Type</th>
                <th className="text-left py-3 px-3 font-semibold hidden sm:table-cell">Sessions</th>
                <th className="text-left py-3 px-3 font-semibold">Total</th>
                <th className="text-left py-3 px-3 font-semibold">Status</th>
                <th className="text-right py-3 px-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const sessionCount = b.sessions_json ? JSON.parse(b.sessions_json).length : 0
                const linkedRequest = pendingBookingRequests.find(r => r.booking_id === b.id)
                return (
                  <tr key={b.id} className={`border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 ${b.status === 'pending' ? 'bg-amber-400/5' : ''}`}>
                    <td className="py-3 px-3 font-mono font-bold text-lime-400">{b.ref}</td>
                    <td className="py-3 px-3 text-theme font-semibold">{b.user_name || b.player_name || '—'}</td>
                    <td className="py-3 px-3 text-theme capitalize">{b.session_type}</td>
                    <td className="py-3 px-3 text-theme hidden sm:table-cell">{sessionCount}</td>
                    <td className="py-3 px-3 text-lime-400 font-bold">{Number(b.total).toLocaleString()} EGP</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColors[b.status] || ''}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewBooking(b)} className="p-1.5 text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button onClick={() => setEditBooking(b)} className="p-1.5 text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit Sessions">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {(b.private_remaining > 0 || b.group_remaining > 0) && (
                              <button onClick={() => {
                                const hasPrivate = (b.private_remaining || 0) > 0
                                const hasGroup = (b.group_remaining || 0) > 0
                                const defaultDir = hasPrivate ? 'private_to_group' : 'group_to_private'
                                setConvertBooking(b)
                                setConvertForm({ direction: defaultDir, count: 1 })
                                setConvertError('')
                              }} className="p-1.5 text-muted hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors" title="Convert Credits">
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                            )}
                            {b.status === 'pending' && (
                              <>
                                {linkedRequest ? (
                                  <>
                                    <button onClick={() => handleRequestDecide(linkedRequest.id, 'approved')} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Approve Booking">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleRequestDecide(linkedRequest.id, 'denied')} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Deny Booking">
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleStatus(b.id, 'confirmed')} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Confirm">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleStatus(b.id, 'cancelled')} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Cancel">
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                            <button onClick={() => setDeleteConfirm(b)} className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-theme shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-theme">Booking {viewBooking.ref}</h3>
              <button onClick={() => setViewBooking(null)} className="p-2 text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Player:</span><span className="text-theme font-bold">{viewBooking.user_name || viewBooking.player_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Type:</span><span className="text-theme capitalize">{viewBooking.session_type}</span></div>
              <div className="flex justify-between"><span className="text-muted">Mode:</span><span className="text-theme capitalize">{viewBooking.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total:</span><span className="text-lime-400 font-bold">{Number(viewBooking.total).toLocaleString()} EGP</span></div>
              <div className="flex justify-between"><span className="text-muted">Status:</span><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColors[viewBooking.status]}`}>{viewBooking.status}</span></div>
              <div className="flex justify-between"><span className="text-muted">Private Remaining:</span><span className="text-lime-400 font-bold">{viewBooking.private_remaining || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted">Group Remaining:</span><span className="text-lime-400 font-bold">{viewBooking.group_remaining || 0}</span></div>
              <div className="pt-2 border-t border-theme">
                <span className="text-muted text-xs font-semibold block mb-2">Sessions:</span>
                <ul className="space-y-1">
                  {viewBooking.sessions_json && JSON.parse(viewBooking.sessions_json).map((s, i) => (
                    <li key={i} className="text-theme text-xs bg-surface/80 border border-theme rounded-lg px-2.5 py-1.5">{s.label}</li>
                  ))}
                </ul>
              </div>
              {viewBooking.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-theme">
                  {(() => {
                    const linkedReq = pendingBookingRequests.find(r => r.booking_id === viewBooking.id)
                    if (linkedReq) {
                      return (
                        <>
                          <button onClick={() => { handleRequestDecide(linkedReq.id, 'approved'); setViewBooking(null) }} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => { handleRequestDecide(linkedReq.id, 'denied'); setViewBooking(null) }} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm flex items-center justify-center gap-2">
                            <XCircle className="w-4 h-4" /> Deny
                          </button>
                        </>
                      )
                    }
                    return (
                      <>
                        <button onClick={() => { handleStatus(viewBooking.id, 'confirmed'); setViewBooking(null) }} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Confirm
                        </button>
                        <button onClick={() => { handleStatus(viewBooking.id, 'cancelled'); setViewBooking(null) }} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editBooking && (
        <EditBookingModal booking={editBooking} onClose={() => setEditBooking(null)} onSaved={() => { setEditBooking(null); fetchBookings() }} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-theme shadow-2xl p-6 text-center">
            <Trash2 className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-theme mb-2">Delete Booking?</h3>
            <p className="text-muted text-sm mb-6">This will permanently delete {deleteConfirm.ref} and free all associated slots. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm font-semibold">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {convertBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-theme shadow-2xl p-6">
            <ArrowRightLeft className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-theme mb-1 text-center">Convert Credits</h3>
            <p className="text-muted text-xs mb-4 text-center">1 Private session = 2 Group sessions</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`rounded-xl border p-3 text-center ${(convertBooking.private_remaining || 0) > 0 ? 'border-purple-400/40 bg-purple-500/5' : 'border-theme opacity-50'}`}>
                <p className="text-[10px] uppercase font-bold text-muted mb-1">Private</p>
                <p className="text-xl font-black text-purple-400">{convertBooking.private_remaining || 0}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${(convertBooking.group_remaining || 0) > 0 ? 'border-purple-400/40 bg-purple-500/5' : 'border-theme opacity-50'}`}>
                <p className="text-[10px] uppercase font-bold text-muted mb-1">Group</p>
                <p className="text-xl font-black text-purple-400">{convertBooking.group_remaining || 0}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-theme uppercase">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConvertForm({ ...convertForm, direction: 'private_to_group' })}
                  disabled={(convertBooking.private_remaining || 0) <= 0}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    convertForm.direction === 'private_to_group'
                      ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'bg-surface border-theme text-theme hover:border-purple-400'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  Private → Group
                </button>
                <button
                  onClick={() => setConvertForm({ ...convertForm, direction: 'group_to_private' })}
                  disabled={(convertBooking.group_remaining || 0) < 2}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    convertForm.direction === 'group_to_private'
                      ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'bg-surface border-theme text-theme hover:border-purple-400'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  Group → Private
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme uppercase mb-1">
                  {convertForm.direction === 'private_to_group' ? 'Private sessions to convert' : 'Group sessions to convert (÷2)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={convertForm.direction === 'private_to_group' ? (convertBooking.private_remaining || 0) : Math.floor((convertBooking.group_remaining || 0) / 2)}
                  value={convertForm.count}
                  onChange={e => setConvertForm({ ...convertForm, count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs"
                />
              </div>
            </div>

            <div className="bg-surface/80 rounded-xl p-3 mb-4 border border-theme">
              {convertForm.direction === 'private_to_group' ? (
                <p className="text-xs text-center">
                  <span className="text-rose-400 font-bold">-{convertForm.count} private</span>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-emerald-400 font-bold">+{convertForm.count * 2} group</span>
                </p>
              ) : (
                <p className="text-xs text-center">
                  <span className="text-rose-400 font-bold">-{convertForm.count * 2} group</span>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-emerald-400 font-bold">+{convertForm.count} private</span>
                </p>
              )}
            </div>

            {convertError && <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1.5 mb-3">{convertError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setConvertBooking(null)} className="flex-1 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm font-semibold">Cancel</button>
              <button onClick={handleConvert} className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-bold">Convert</button>
            </div>
          </div>
        </div>
      )}

      {changeTimeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-theme shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-theme">Change Time Slot</h3>
              <button onClick={() => setChangeTimeSlot(null)} className="p-2 text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-theme uppercase mb-1">Date</label>
                <input type="date" value={changeTimeForm.date} onChange={e => setChangeTimeForm({ ...changeTimeForm, date: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme uppercase mb-1">Time</label>
                <select value={changeTimeForm.time} onChange={e => setChangeTimeForm({ ...changeTimeForm, time: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs">
                  {Object.keys(TIME_LABELS).map(t => <option key={t} value={t}>{TIME_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme uppercase mb-1">Court</label>
                <select value={changeTimeForm.court} onChange={e => setChangeTimeForm({ ...changeTimeForm, court: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs">
                  <option value={1}>Court 1</option>
                  <option value={2}>Court 2</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setChangeTimeSlot(null)} className="flex-1 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm font-semibold">Cancel</button>
              <button onClick={handleSlotChangeTime} className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditBookingModal({ booking, onClose, onSaved }) {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(booking.sessions_json || '[]') } catch { return [] }
  })
  const [sessionType, setSessionType] = useState(booking.session_type)
  const [loading, setLoading] = useState(false)

  const updateSession = (index, field, value) => {
    const updated = [...sessions]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'date' || field === 'time' || field === 'court') {
      const tl = { '14:00': '2:00–3:00', '15:00': '3:00–4:00', '16:00': '4:00–5:00', '17:00': '5:00–6:00', '18:00': '6:00–7:00', '19:00': '7:00–8:00', '20:00': '8:00–9:00', '21:00': '9:00–10:00', '22:00': '10:00–11:00', '23:00': '11:00–12:00' }
      updated[index].label = `${updated[index].date} · ${tl[updated[index].time] || updated[index].time} · Court ${updated[index].court}`
    }
    setSessions(updated)
  }

  const removeSession = (index) => {
    setSessions(sessions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const pricing = { private: { 1: 1000, 4: 3600, 8: 7000, 12: 10800, 16: 14000 }, group: { 1: 500, 4: 1800, 8: 3500, 16: 7000 } }
      const tier = pricing[sessionType]
      const exact = tier?.[sessions.length]
      const total = exact || sessions.length * (tier?.[1] || 0)
      await api.put(`/bookings/${booking.id}/sessions`, { sessions, sessionType, total })
      onSaved()
    } catch {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-theme shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-theme">Edit {booking.ref}</h3>
          <button onClick={onClose} className="p-2 text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-theme uppercase mb-1">Session Type</label>
          <select value={sessionType} onChange={e => setSessionType(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs">
            <option value="private">Private</option>
            <option value="group">Group (2 Persons)</option>
          </select>
        </div>

        <div className="space-y-2 mb-4">
          {sessions.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="date" value={s.date} onChange={e => updateSession(i, 'date', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-surface border border-theme text-theme text-[11px]" />
              <select value={s.time} onChange={e => updateSession(i, 'time', e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface border border-theme text-theme text-[11px]">
                {['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={s.court} onChange={e => updateSession(i, 'court', parseInt(e.target.value))} className="px-2 py-1.5 rounded-lg bg-surface border border-theme text-theme text-[11px]">
                <option value={1}>Court 1</option>
                <option value={2}>Court 2</option>
              </select>
              <button onClick={() => removeSession(i)} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm font-semibold">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
