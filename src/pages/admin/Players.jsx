import { useState, useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2, Download, Edit, FileUp, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { api, downloadFile } from '../../lib/api'

function PlayerModal({ player, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: player?.full_name || '',
    email: player?.email || '',
    phone: player?.phone || '',
    dob: player?.dob || '',
    skill_level: player?.skill_level || 'Intermediate',
    notes: player?.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (player) {
        await api.put(`/players/${player.id}`, form)
      } else {
        await api.post('/players', form)
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{player ? 'Edit Player' : 'Add Player'}</h3>
          <button onClick={onClose} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">DOB</label>
              <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Skill Level</label>
            <select value={form.skill_level} onChange={e => setForm({ ...form, skill_level: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm transition-all disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mx-auto" /> : 'Save Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportModal({ kind, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const data = await api.upload(`/imports/${kind}/preview`, fd)
      setPreview(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    setCommitting(true)
    setError('')
    try {
      const data = await api.post(`/imports/${kind}/commit`, { rows: preview.preview, filename: preview.filename })
      setResult(data)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setCommitting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const blob = await downloadFile(`/imports/template/${kind}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${kind}_import_template.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Import Complete</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{result.inserted} {kind} imported successfully.</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Import {kind.charAt(0).toUpperCase() + kind.slice(1)} from Excel</h3>
          <button onClick={onClose} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button onClick={downloadTemplate} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800">
            <Download className="w-4 h-4" /> Download Template
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center mb-4">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} className="hidden" />
          <FileUp className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{file ? file.name : 'Drop your Excel file here or click to browse'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => fileRef.current.click()} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold">Choose File</button>
            {file && <button onClick={handleUpload} disabled={loading} className="px-4 py-2 rounded-xl bg-lime-400 text-slate-950 text-sm font-bold disabled:opacity-50">{loading ? 'Processing...' : 'Upload & Preview'}</button>}
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>}

        {preview && (
          <div>
            <div className="flex items-center gap-4 mb-3 text-sm">
              <span className="text-slate-900 dark:text-white font-semibold">Total: {preview.totalRows}</span>
              <span className="text-lime-400 font-semibold">Valid: {preview.validRows}</span>
              <span className="text-rose-400 font-semibold">Errors: {preview.errors.length}</span>
            </div>

            {preview.errors.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs max-h-32 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <div key={i}>Row {e.row}: {e.errors.join(', ')}</div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto max-h-64 overflow-y-auto mb-4">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="text-slate-500 dark:text-slate-400 uppercase">
                    {preview.preview[0] && Object.keys(preview.preview[0]).map(k => (
                      <th key={k} className="text-left px-3 py-2 font-semibold">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {preview.preview.map((row, i) => (
                    <tr key={i} className="text-slate-700 dark:text-slate-300">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handleCommit} disabled={committing || preview.validRows === 0} className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm disabled:opacity-50">
              {committing ? 'Importing...' : `Import ${preview.validRows} Valid Rows`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editPlayer, setEditPlayer] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const fetchPlayers = () => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 20 })
    if (search) params.set('search', search)
    if (skillFilter) params.set('skill', skillFilter)
    api.get(`/players?${params}`).then(data => { setPlayers(data.players); setTotal(data.total) }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPlayers() }, [page, skillFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchPlayers()
  }

  const handleDelete = async (id) => {
    try { await api.del(`/players/${id}`); setDeleteConfirm(null); fetchPlayers() } catch {}
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-black text-slate-900 dark:text-white">Players</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{total} total players</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Player
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400" />
          </div>
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-700">Search</button>
        </form>
        <select value={skillFilter} onChange={e => { setSkillFilter(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-lime-400">
          <option value="">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">No players found.</div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-6 py-4 font-semibold">Name</th>
                  <th className="text-left px-6 py-4 font-semibold">Email</th>
                  <th className="text-left px-6 py-4 font-semibold">Phone</th>
                  <th className="text-left px-6 py-4 font-semibold">Skill</th>
                  <th className="text-left px-6 py-4 font-semibold">Joined</th>
                  <th className="text-right px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {players.map(p => (
                  <tr key={p.id} className="hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-xs">{p.full_name.charAt(0)}</div>
                        <span className="font-semibold text-slate-900 dark:text-white">{p.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{p.email}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{p.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.skill_level === 'Advanced' ? 'bg-purple-500/10 text-purple-400' : p.skill_level === 'Beginner' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {p.skill_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditPlayer(p)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(p)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm disabled:opacity-50">Prev</button>
          <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {(showAdd || editPlayer) && <PlayerModal player={editPlayer} onClose={() => { setShowAdd(false); setEditPlayer(null) }} onSave={() => { setShowAdd(false); setEditPlayer(null); fetchPlayers() }} />}
      {showImport && <ImportModal kind="players" onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); fetchPlayers() }} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Player?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Are you sure you want to delete {deleteConfirm.full_name}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
