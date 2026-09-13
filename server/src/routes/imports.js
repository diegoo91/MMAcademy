import { Router } from 'express'
import multer from 'multer'
import XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const upload = multer({ dest: join(__dirname, '..', '..', 'uploads'), limits: { fileSize: 10 * 1024 * 1024 } })

const router = Router()
router.use(authenticate)
router.use(requireRole('superadmin', 'admin'))

const TEMPLATES = {
  players: {
    headers: ['fullName', 'email', 'phone', 'dob', 'skillLevel'],
    headerLabels: ['Full Name', 'Email', 'Phone', 'DOB (YYYY-MM-DD)', 'Skill Level (Beginner|Intermediate|Advanced)'],
    validate(row) {
      const errors = []
      if (!row.fullName?.trim()) errors.push('fullName is required')
      if (!row.email?.trim()) errors.push('email is required')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email format')
      if (row.skillLevel && !['Beginner', 'Intermediate', 'Advanced'].includes(row.skillLevel)) errors.push(`Invalid skillLevel: ${row.skillLevel}`)
      if (row.dob && !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) errors.push('dob must be YYYY-MM-DD')
      return errors
    },
    commit(rows) {
      let count = 0
      for (const r of rows) {
        if (!r.email?.trim()) continue
        const existing = db.find('players', p => p.email.toLowerCase().trim() === r.email.toLowerCase().trim())
        if (existing) continue
        db.insert('players', { full_name: r.fullName.trim(), email: r.email.trim().toLowerCase(), phone: r.phone || '', dob: r.dob || '', skill_level: r.skillLevel || 'Intermediate', notes: '' })
        count++
      }
      return count
    }
  },
  results: {
    headers: ['date', 'playerA', 'playerB', 'scoreA', 'scoreB', 'winner', 'court', 'competition'],
    headerLabels: ['Date', 'Player A', 'Player B', 'Score A', 'Score B', 'Winner', 'Court (1|2)', 'Competition'],
    validate(row) {
      const errors = []
      if (!row.date?.trim()) errors.push('date is required')
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.push('date must be YYYY-MM-DD')
      if (!row.playerA?.trim()) errors.push('playerA is required')
      if (!row.playerB?.trim()) errors.push('playerB is required')
      if (row.court && ![1, 2, '1', '2'].includes(row.court)) errors.push('court must be 1 or 2')
      return errors
    },
    commit(rows, batchId) {
      let count = 0
      for (const r of rows) {
        db.insert('results', {
          date: r.date.trim(), player_a: r.playerA.trim(), player_b: r.playerB.trim(),
          score_a: parseInt(r.scoreA) || 0, score_b: parseInt(r.scoreB) || 0,
          winner: r.winner || '', court: parseInt(r.court) || 1, competition: r.competition || '',
          notes: '', import_batch: batchId
        })
        count++
      }
      return count
    }
  },
  schedule: {
    headers: ['date', 'time', 'court', 'playerText'],
    headerLabels: ['Date', 'Time (HH:MM)', 'Court (1|2)', 'Player Name (optional)'],
    validate(row) {
      const errors = []
      if (!row.date?.trim()) errors.push('date is required')
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.push('date must be YYYY-MM-DD')
      if (!row.time?.trim()) errors.push('time is required')
      else if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(row.time.trim())) errors.push('time must be HH:MM (24h)')
      if (!row.court) errors.push('court is required')
      else if (![1, 2, '1', '2'].includes(row.court)) errors.push('court must be 1 or 2')
      return errors
    },
    commit(rows) {
      let count = 0
      for (const r of rows) {
        db.upsert('slots', ['date', 'time', 'court'], {
          date: r.date.trim(), time: r.time.trim(), court: parseInt(r.court),
          player_text: r.playerText || '', booking_id: null
        })
        count++
      }
      return count
    }
  }
}

function normalizeHeader(h) {
  return String(h).replace(/\*/g, '').replace(/\(.*?\)/g, '').replace(/_/g, ' ').trim().toLowerCase()
}

router.get('/template/:kind', (req, res) => {
  const { kind } = req.params
  const tmpl = TEMPLATES[kind]
  if (!tmpl) return res.status(404).json({ error: 'Unknown import kind' })
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([tmpl.headerLabels || tmpl.headers])
  XLSX.utils.book_append_sheet(wb, ws, kind)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${kind}_import_template.xlsx"`)
  res.send(buf)
})

router.post('/:kind/preview', upload.single('file'), (req, res) => {
  try {
    const { kind } = req.params
    const tmpl = TEMPLATES[kind]
    if (!tmpl) return res.status(400).json({ error: 'Unknown import kind' })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const wb = XLSX.readFile(req.file.path)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
    if (data.length === 0) return res.status(400).json({ error: 'File is empty' })
    if (data.length > 1000) return res.status(400).json({ error: 'Maximum 1000 rows per import' })

    const aliases = {
      fullName: ['fullName', 'full_name', 'name', 'fullname'],
      email: ['email', 'e-mail', 'emailaddress'],
      phone: ['phone', 'phone_number', 'phonenumber', 'mobile'],
      dob: ['dob', 'date_of_birth', 'dateofbirth', 'birthdate', 'birth_date', 'birthday'],
      skillLevel: ['skillLevel', 'skill_level', 'skilllevel', 'skill', 'level'],
      date: ['date', 'gamedate', 'game_date'],
      playerA: ['playerA', 'player_a', 'player1', 'playera', 'player1name'],
      playerB: ['playerB', 'player_b', 'player2', 'playerb', 'player2name'],
      scoreA: ['scoreA', 'score_a', 'score1', 'scorea'],
      scoreB: ['scoreB', 'score_b', 'score2', 'scoreb'],
      winner: ['winner', 'won'],
      court: ['court', 'court_number', 'courtnumber'],
      competition: ['competition', 'tournament', 'event', 'match'],
      time: ['time', 'timeslot', 'time_slot', 'timeslot'],
      playerText: ['playerText', 'player_text', 'player', 'playername', 'player_name'],
    }

    const keys = Object.keys(data[0])
    const normalizedKeys = keys.map(k => normalizeHeader(k))
    const colMap = {}

    for (const [field, names] of Object.entries(aliases)) {
      const found = keys.find((k, i) => {
        const nk = normalizedKeys[i]
        return names.includes(k) || names.includes(nk) || names.some(n => nk.includes(n))
      })
      if (found) colMap[field] = found
    }

    const rows = []
    const allErrors = []
    for (let i = 0; i < data.length; i++) {
      const mapped = {}
      for (const [field, col] of Object.entries(colMap)) {
        const val = data[i][col]
        mapped[field] = val !== undefined && val !== null ? String(val).trim() : ''
      }
      const errors = tmpl.validate(mapped)
      allErrors.push(errors.length ? { row: i + 2, errors } : null)
      rows.push(mapped)
    }

    res.json({
      filename: req.file.originalname,
      totalRows: data.length,
      validRows: data.length - allErrors.filter(Boolean).length,
      errors: allErrors.filter(Boolean),
      preview: rows.slice(0, 20),
      allRows: rows,
    })
  } catch (err) {
    console.error('Preview error:', err)
    res.status(500).json({ error: 'Failed to parse file' })
  }
})

router.post('/:kind/commit', (req, res) => {
  try {
    const { kind } = req.params
    const { rows, filename } = req.body
    const tmpl = TEMPLATES[kind]
    if (!tmpl) return res.status(400).json({ error: 'Unknown import kind' })
    if (!rows || !Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows to commit' })

    let errorCount = 0
    for (const row of rows) { if (tmpl.validate(row).length) errorCount++ }
    const batch = db.insert('import_batches', { kind, filename: filename || 'unknown.xlsx', row_count: rows.length, error_count: errorCount, by_user: req.user.id, status: 'committed' })
    const inserted = tmpl.commit(rows, batch.id)
    res.json({ batchId: batch.id, kind, inserted, totalRows: rows.length, errorRows: errorCount })
  } catch (err) {
    console.error('Commit error:', err)
    res.status(500).json({ error: 'Commit failed' })
  }
})

router.get('/batches', (req, res) => {
  try {
    const batches = db.query('import_batches', { orderBy: (a, b) => new Date(b.created_at) - new Date(a.created_at) })
      .slice(0, 50)
      .map(b => {
        const u = b.by_user ? db.get('users', b.by_user) : null
        return { ...b, user_name: u ? u.name : null }
      })
    res.json(batches)
  } catch (err) {
    console.error('List batches error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
