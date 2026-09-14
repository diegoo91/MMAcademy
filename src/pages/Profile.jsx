import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Clock, Mail, Phone, Shield, ArrowRightLeft, Calendar, Trophy, AlertTriangle, CheckCircle, XCircle, Send } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', skill_level: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showResultModal, setShowResultModal] = useState(false)
  const [pendingResultsCount, setPendingResultsCount] = useState(0)
  const [bookingRequests, setBookingRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const fetchBookingRequests = () => {
    setRequestsLoading(true)
    api.get('/booking-requests?status=pending')
      .then(data => setBookingRequests(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setRequestsLoading(false))
  }

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setForm({ name: user.name || '', phone: user.phone || '', skill_level: user.skill_level || 'Intermediate' })
    api.get('/bookings')
      .then(data => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/results?limit=200')
      .then(data => {
        const pending = (data.results || []).filter(r => r.status === 'pending' && r.submitted_by === user.id)
        setPendingResultsCount(pending.length)
      })
      .catch(() => {})
    fetchBookingRequests()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const updated = await api.put('/auth/profile', form)
      setUser(updated)
      setEditing(false)
      setMsg('Profile updated!')
    } catch (err) {
      setMsg(err.message || 'Failed to update')
    }
    setSaving(false)
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('avatar', file)
    try {
      const data = await api.upload('/auth/avatar', fd)
      setUser({ ...user, avatar: data.avatar })
    } catch {}
  }

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const totalSessions = bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => {
    try { return sum + JSON.parse(b.sessions_json).length } catch { return sum }
  }, 0)

  const totalPrivateRemaining = user.private_balance || 0
  const totalGroupRemaining = user.group_balance || 0
  const hasCredits = totalPrivateRemaining > 0 || totalGroupRemaining > 0

  const visibleBookings = user?.role === 'player'
    ? bookings.filter(b => b.status !== 'cancelled')
    : bookings

  const statusColors = {
    pending: 'bg-amber-400/20 text-amber-400',
    confirmed: 'bg-emerald-400/20 text-emerald-400',
    cancelled: 'bg-rose-400/20 text-rose-400',
    completed: 'bg-slate-400/20 text-slate-400',
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-theme text-theme py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="glass-panel rounded-3xl border border-theme p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-lime-400/60 bg-surface">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lime-400 text-3xl font-bold">
                    {user.name?.charAt(0)}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-slate-50/60 dark:bg-slate-950/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-lime-400" />
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-heading text-2xl font-black text-theme">{user.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-muted">
                <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-lime-400" />{user.email}</span>
                {user.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-lime-400" />{user.phone}</span>}
                <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-lime-400" />{user.role}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold">
                  {user.skill_level || 'Intermediate'}
                </span>
                <span className="text-xs text-muted">Member since {user.member_since || new Date().getFullYear()}</span>
              </div>
            </div>

            <button onClick={() => setEditing(!editing)} className="px-4 py-2 rounded-xl bg-surface border border-theme text-theme text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {editing && (
            <div className="space-y-4 pt-4 border-t border-theme max-w-md">
              <div>
                <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Skill Level</label>
                <select value={form.skill_level} onChange={e => setForm({ ...form, skill_level: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              {msg && <p className={`text-xs ${msg.includes('updated') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</p>}
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: bookings.length },
            { label: 'Total Sessions', value: totalSessions },
            { label: 'Confirmed', value: confirmedCount },
            { label: 'Pending', value: pendingCount },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 text-center bg-white/60 dark:bg-slate-900/60">
              <div className="font-heading text-3xl font-black text-lime-400">{stat.value}</div>
              <div className="text-xs font-semibold text-muted mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pending Booking Requests */}
        {user?.role === 'player' && (
          <BookingRequestsPanel
            requests={bookingRequests}
            loading={requestsLoading}
            onRefresh={fetchBookingRequests}
          />
        )}

        {/* Session Credits */}
        {(totalPrivateRemaining > 0 || totalGroupRemaining > 0) && (
          <div className="glass-panel rounded-3xl border border-theme p-6 sm:p-8">
            <h2 className="font-heading text-xl font-extrabold text-theme mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" /> Remaining Session Credits
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-surface/80 border border-theme text-center">
                <div className="font-heading text-3xl font-black text-lime-400">{totalPrivateRemaining}</div>
                <div className="text-xs font-semibold text-muted mt-1 uppercase tracking-wider">Private Sessions</div>
              </div>
              <div className="p-4 rounded-2xl bg-surface/80 border border-theme text-center">
                <div className="font-heading text-3xl font-black text-purple-400">{totalGroupRemaining}</div>
                <div className="text-xs font-semibold text-muted mt-1 uppercase tracking-wider">Group Sessions</div>
              </div>
            </div>
            <p className="text-[11px] text-muted mt-3 text-center">1 Private session = 2 Group sessions.</p>
            <ConversionRequestButton privateRemaining={totalPrivateRemaining} groupRemaining={totalGroupRemaining} />
          </div>
        )}

        {/* Booking History */}
        <div className="glass-panel rounded-3xl border border-theme p-6 sm:p-8">
          <h2 className="font-heading text-xl font-extrabold text-theme mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-lime-400" /> Booking History
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : visibleBookings.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No bookings yet. <a href="/book" className="text-lime-400 font-bold hover:underline">Book a session</a></p>
          ) : (
            <div className="space-y-3">
              {visibleBookings.map(b => {
                let sessionCount = 0
                try { sessionCount = JSON.parse(b.sessions_json).length } catch {}
                return (
                  <div key={b.id} className="p-4 rounded-2xl bg-surface/80 border border-theme flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-bold text-lime-400">{b.ref}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[b.status] || ''}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted capitalize">{b.session_type} — {sessionCount} session{sessionCount === 1 ? '' : 's'} — {Number(b.total).toLocaleString()} EGP</p>
                      <p className="text-[11px] text-muted mt-0.5">{b.created_at?.slice(0, 10)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {user?.role === 'player' && (
            <div className="mt-6 pt-4 border-t border-theme space-y-3">
              {pendingResultsCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold text-center">
                  You have {pendingResultsCount} pending result{pendingResultsCount === 1 ? '' : 's'} awaiting confirmation
                </div>
              )}
              <button onClick={() => setShowResultModal(true)} className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20">
                <Trophy className="w-4 h-4" />
                Submit Match Result
              </button>
              <Link
                to={hasCredits ? '/schedule?mine=1' : '/book'}
                className="w-full py-3.5 rounded-xl bg-surface border border-theme text-theme font-extrabold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {hasCredits ? 'Book Session from Schedule' : 'Book a New Session'}
              </Link>
            </div>
          )}
        </div>
      </div>
      {showResultModal && (
        <PlayerResultModal user={user} onClose={() => setShowResultModal(false)} onSaved={() => { setShowResultModal(false); setPendingResultsCount(c => c + 1) }} />
      )}
    </div>
  )
}

function ConversionRequestButton({ privateRemaining, groupRemaining }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ from: 'private', count: 1 })
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    setSending(true)
    setMsg('')
    try {
      const to = form.from === 'private' ? 'group' : 'private'
      await api.post('/conversion-requests', { from: form.from, to, count: parseInt(form.count) })
      setMsg('Request sent! Admin will review shortly.')
      setOpen(false)
    } catch (err) {
      setMsg(err.message || 'Failed to send request')
    }
    setSending(false)
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full py-2.5 rounded-xl bg-surface border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5" /> Request Credit Conversion
        </button>
      ) : (
        <div className="p-4 rounded-xl bg-surface/80 border border-purple-500/20 space-y-3">
          <div className="flex gap-2">
            {privateRemaining > 0 && (
              <button onClick={() => setForm({ ...form, from: 'private' })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${form.from === 'private' ? 'bg-purple-500 text-white border-purple-500' : 'bg-surface border-theme text-theme'}`}>
                Private → Group
              </button>
            )}
            {groupRemaining >= 2 && (
              <button onClick={() => setForm({ ...form, from: 'group' })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${form.from === 'group' ? 'bg-purple-500 text-white border-purple-500' : 'bg-surface border-theme text-theme'}`}>
                Group → Private
              </button>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase mb-1">
              {form.from === 'private' ? 'Private sessions to convert' : 'Group sessions to convert (÷2)'}
            </label>
            <input type="number" min={1} max={form.from === 'private' ? privateRemaining : Math.floor(groupRemaining / 2)} value={form.count} onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 1 })} className="w-full px-3 py-1.5 rounded-lg bg-surface border border-theme text-theme text-xs" />
          </div>
          <p className="text-[11px] text-center text-slate-400">
            {form.from === 'private' ? `→ +${form.count * 2} group sessions` : `→ +${form.count} private sessions`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-surface border border-theme text-theme text-xs font-semibold">Cancel</button>
            <button onClick={handleSubmit} disabled={sending} className="flex-1 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold disabled:opacity-50">
              {sending ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
      {msg && <p className={`text-[11px] mt-2 text-center ${msg.includes('sent') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</p>}
    </div>
  )
}

function PlayerResultModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    format: 'short',
    sideA: [user?.name || ''],
    sideB: [''],
    score_a: '',
    score_b: '',
    court: 1,
    competition: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const scoreA = Number(form.score_a) || 0
  const scoreB = Number(form.score_b) || 0
  const scoresFilled = form.score_a !== '' && form.score_b !== ''
  const tie = scoresFilled && scoreA === scoreB

  const updateSide = (side, idx, value) => {
    const arr = [...form[side]]
    arr[idx] = value
    setForm({ ...form, [side]: arr })
  }

  const addPlayer = (side) => {
    if (form[side].length < 2) setForm({ ...form, [side]: [...form[side], ''] })
  }

  const removePlayer = (side, idx) => {
    if (form[side].length > 1) setForm({ ...form, [side]: form[side].filter((_, i) => i !== idx) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/results', {
        date: form.date,
        format: form.format,
        sideA: form.sideA.map(s => s.trim()).filter(Boolean),
        sideB: form.sideB.map(s => s.trim()).filter(Boolean),
        score_a: scoreA,
        score_b: scoreB,
        court: form.court,
        competition: form.competition,
        notes: form.notes,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = form.date && form.sideA[0]?.trim() && form.sideB[0]?.trim() && scoresFilled && !tie

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-theme shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-theme">Submit Match Result</h3>
          <button onClick={onClose} className="p-2 text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">&times;</button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Court</label>
              <select value={form.court} onChange={e => setForm({ ...form, court: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400">
                <option value={1}>Court 1</option>
                <option value={2}>Court 2</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Format *</label>
            <div className="flex gap-2">
              {[{ v: 'short', l: 'Short Set' }, { v: 'long', l: 'Long Set' }, { v: 'tiebreak', l: 'Tiebreak' }].map(o => (
                <button key={o.v} type="button" onClick={() => setForm({ ...form, format: o.v })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.format === o.v ? 'bg-lime-400 text-slate-950 border-lime-400' : 'bg-surface border-theme text-theme hover:border-lime-400'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-lime-400 uppercase tracking-wider">Side A *</label>
              {form.sideA.map((name, i) => (
                <div key={i} className="flex gap-1">
                  <input type="text" value={name} onChange={e => updateSide('sideA', i, e.target.value)} required={i === 0} placeholder="Player name"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
                  {form.sideA.length > 1 && <button type="button" onClick={() => removePlayer('sideA', i)} className="px-2 text-rose-400 hover:text-rose-300">&times;</button>}
                </div>
              ))}
              {form.sideA.length < 2 && <button type="button" onClick={() => addPlayer('sideA')} className="text-[10px] font-bold text-lime-400 hover:text-lime-300">+ Add Partner</button>}
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider">Side B *</label>
              {form.sideB.map((name, i) => (
                <div key={i} className="flex gap-1">
                  <input type="text" value={name} onChange={e => updateSide('sideB', i, e.target.value)} required={i === 0} placeholder="Opponent name"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
                  {form.sideB.length > 1 && <button type="button" onClick={() => removePlayer('sideB', i)} className="px-2 text-rose-400 hover:text-rose-300">&times;</button>}
                </div>
              ))}
              {form.sideB.length < 2 && <button type="button" onClick={() => addPlayer('sideB')} className="text-[10px] font-bold text-rose-400 hover:text-rose-300">+ Add Opponent</button>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Score A *</label>
              <input type="number" min="0" value={form.score_a} onChange={e => setForm({ ...form, score_a: e.target.value === '' ? '' : parseInt(e.target.value) })} required className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Score B *</label>
              <input type="number" min="0" value={form.score_b} onChange={e => setForm({ ...form, score_b: e.target.value === '' ? '' : parseInt(e.target.value) })} required className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
            </div>
          </div>
          {scoresFilled && (
            <div className={`p-3 rounded-xl text-center text-sm font-bold ${tie ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
              {tie ? 'Scores cannot be tied' : <>Winner: <span className="text-lime-400">{scoreA > scoreB ? form.sideA[0] : form.sideB[0]}</span></>}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Competition</label>
            <input type="text" value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })} placeholder="e.g. League, Tournament" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-theme text-theme text-sm focus:outline-none focus:border-lime-400 resize-none" />
          </div>
          <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold text-center">
            Player submissions require admin confirmation before appearing in reports.
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-surface border border-theme text-theme font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={loading || !canSubmit} className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mx-auto" /> : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BookingRequestsPanel({ requests, loading, onRefresh }) {
  const [responding, setResponding] = useState(null)
  const [cancelForm, setCancelForm] = useState(null)
  const [modifyForm, setModifyForm] = useState(null)
  const [msg, setMsg] = useState('')

  const handleRespond = async (id, response) => {
    setResponding(id)
    setMsg('')
    try {
      await api.put(`/booking-requests/${id}/respond`, { response })
      if (response === 'no') {
        // Find the request to show cancel/modify options
        const req = requests.find(r => r.id === id)
        setCancelForm(req)
      }
      onRefresh()
    } catch (err) {
      setMsg(err.message || 'Failed')
    }
    setResponding(null)
  }

  const handleCancel = async (slotId, bookingId) => {
    setMsg('')
    try {
      await api.post('/booking-requests', { kind: 'cancel', slot_id: slotId, booking_id: bookingId })
      setMsg('Cancellation request submitted!')
      setCancelForm(null)
      onRefresh()
    } catch (err) {
      setMsg(err.message || 'Failed')
    }
  }

  const handleModify = async (slotId, bookingId) => {
    if (!modifyForm?.proposed_date || !modifyForm?.proposed_time) {
      setMsg('Please select new date and time')
      return
    }
    setMsg('')
    try {
      await api.post('/booking-requests', {
        kind: 'modify', slot_id: slotId, booking_id: bookingId,
        payload: { proposed_date: modifyForm.proposed_date, proposed_time: modifyForm.proposed_time }
      })
      setMsg('Modification request submitted!')
      setModifyForm(null)
      setCancelForm(null)
      onRefresh()
    } catch (err) {
      setMsg(err.message || 'Failed')
    }
  }

  const attendanceRequests = requests.filter(r => r.kind === 'attendance_confirm')
  const otherRequests = requests.filter(r => r.kind !== 'attendance_confirm')

  if (loading) return null
  if (requests.length === 0) return null

  return (
    <div className="glass-panel rounded-3xl border border-theme p-6 sm:p-8">
      <h2 className="font-heading text-xl font-extrabold text-theme mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" /> Pending Requests
      </h2>

      {msg && (
        <p className={`text-xs mb-3 text-center ${msg.includes('submitted') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</p>
      )}

      {/* Attendance Confirmation */}
      {attendanceRequests.length > 0 && (
        <div className="space-y-3 mb-4">
          {attendanceRequests.map(r => (
            <div key={r.id} className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/20">
              <p className="text-sm font-bold text-theme mb-1">Confirm Attendance</p>
              <p className="text-xs text-muted mb-3">
                Slot: {r.payload?.date || 'N/A'} — Are you attending?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond(r.id, 'yes')}
                  disabled={responding === r.id}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Yes
                </button>
                <button
                  onClick={() => handleRespond(r.id, 'no')}
                  disabled={responding === r.id}
                  className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel/Modify sub-form */}
      {cancelForm && (
        <div className="p-4 rounded-2xl bg-surface/80 border border-theme mb-4">
          <p className="text-sm font-bold text-theme mb-3">What would you like to do?</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => handleCancel(cancelForm.slot_id, cancelForm.booking_id)} className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold">Request Cancel</button>
            <button onClick={() => setModifyForm({ proposed_date: '', proposed_time: '' })} className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold">Request Modify</button>
          </div>
          {modifyForm && (
            <div className="space-y-2 pt-2 border-t border-theme">
              <input type="date" value={modifyForm.proposed_date} onChange={e => setModifyForm({ ...modifyForm, proposed_date: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs" />
              <select value={modifyForm.proposed_time} onChange={e => setModifyForm({ ...modifyForm, proposed_time: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-surface border border-theme text-theme text-xs">
                <option value="">Select time</option>
                {['14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setModifyForm(null)} className="flex-1 py-2 rounded-xl bg-surface border border-theme text-theme text-xs font-semibold">Back</button>
                <button onClick={() => handleModify(cancelForm.slot_id, cancelForm.booking_id)} className="flex-1 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-1">
                  <Send className="w-3 h-3" /> Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other pending requests */}
      {otherRequests.length > 0 && (
        <div className="space-y-2">
          {otherRequests.map(r => (
            <div key={r.id} className="p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-theme flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-400 border border-amber-400/40 mr-2">
                  {r.kind}
                </span>
                <span className="text-xs text-muted">
                  {r.payload?.date || r.slot_id ? `Slot #${r.slot_id}` : 'N/A'}
                </span>
              </div>
              <span className="text-[10px] text-muted">{r.created_at?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
