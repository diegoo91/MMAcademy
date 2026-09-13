import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Clock, Mail, Phone, Shield, ArrowRightLeft, Calendar } from 'lucide-react'
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

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setForm({ name: user.name || '', phone: user.phone || '', skill_level: user.skill_level || 'Intermediate' })
    api.get('/bookings')
      .then(data => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false))
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

  const totalPrivateRemaining = bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.private_remaining || 0), 0)
  const totalGroupRemaining = bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.group_remaining || 0), 0)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-lime-400/60 bg-white dark:bg-slate-900">
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
              <h1 className="font-heading text-2xl font-black text-slate-900 dark:text-white">{user.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-lime-400" />{user.email}</span>
                {user.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-lime-400" />{user.phone}</span>}
                <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-lime-400" />{user.role}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold">
                  {user.skill_level || 'Intermediate'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Member since {user.member_since || new Date().getFullYear()}</span>
              </div>
            </div>

            <button onClick={() => setEditing(!editing)} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {editing && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Skill Level</label>
                <select value={form.skill_level} onChange={e => setForm({ ...form, skill_level: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400">
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
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Session Credits */}
        {(totalPrivateRemaining > 0 || totalGroupRemaining > 0) && (
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            <h2 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" /> Remaining Session Credits
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
                <div className="font-heading text-3xl font-black text-lime-400">{totalPrivateRemaining}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Private Sessions</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
                <div className="font-heading text-3xl font-black text-purple-400">{totalGroupRemaining}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Group Sessions</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">1 Private session = 2 Group sessions.</p>
            <ConversionRequestButton privateRemaining={totalPrivateRemaining} groupRemaining={totalGroupRemaining} bookings={bookings} />
          </div>
        )}

        {/* Booking History */}
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <h2 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-lime-400" /> Booking History
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : visibleBookings.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">No bookings yet. <a href="/book" className="text-lime-400 font-bold hover:underline">Book a session</a></p>
          ) : (
            <div className="space-y-3">
              {visibleBookings.map(b => {
                let sessionCount = 0
                try { sessionCount = JSON.parse(b.sessions_json).length } catch {}
                return (
                  <div key={b.id} className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-bold text-lime-400">{b.ref}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[b.status] || ''}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{b.session_type} — {sessionCount} session{sessionCount === 1 ? '' : 's'} — {Number(b.total).toLocaleString()} EGP</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{b.created_at?.slice(0, 10)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {user?.role === 'player' && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                to={hasCredits ? '/schedule?mine=1' : '/book'}
                className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20"
              >
                <Calendar className="w-4 h-4" />
                {hasCredits ? 'Book Session from Schedule' : 'Book a New Session'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversionRequestButton({ privateRemaining, groupRemaining, bookings }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ from: 'private', count: 1 })
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  const confirmedBooking = bookings.find(b => b.status === 'confirmed' && (b.private_remaining > 0 || b.group_remaining > 0))
  if (!confirmedBooking) return null

  const handleSubmit = async () => {
    setSending(true)
    setMsg('')
    try {
      const to = form.from === 'private' ? 'group' : 'private'
      await api.post('/conversion-requests', { booking_id: confirmedBooking.id, from: form.from, to, count: parseInt(form.count) })
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
        <button onClick={() => setOpen(true)} className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5" /> Request Credit Conversion
        </button>
      ) : (
        <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-500/20 space-y-3">
          <div className="flex gap-2">
            {privateRemaining > 0 && (
              <button onClick={() => setForm({ ...form, from: 'private' })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${form.from === 'private' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'}`}>
                Private → Group
              </button>
            )}
            {groupRemaining >= 2 && (
              <button onClick={() => setForm({ ...form, from: 'group' })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${form.from === 'group' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'}`}>
                Group → Private
              </button>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
              {form.from === 'private' ? 'Private sessions to convert' : 'Group sessions to convert (÷2)'}
            </label>
            <input type="number" min={1} max={form.from === 'private' ? privateRemaining : Math.floor(groupRemaining / 2)} value={form.count} onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 1 })} className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
          </div>
          <p className="text-[11px] text-center text-slate-400">
            {form.from === 'private' ? `→ +${form.count * 2} group sessions` : `→ +${form.count} private sessions`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold">Cancel</button>
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
