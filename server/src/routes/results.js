import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)

router.get('/', (req, res) => {
  try {
    const { from, to, player, competition, page = 1, limit = 100 } = req.query
    let all = db.findAll('results')
    if (from) all = all.filter(r => r.date >= from)
    if (to) all = all.filter(r => r.date <= to)
    if (player) { const q = player.toLowerCase(); all = all.filter(r => r.player_a.toLowerCase().includes(q) || r.player_b.toLowerCase().includes(q)) }
    if (competition) all = all.filter(r => r.competition === competition)
    all.sort((a, b) => new Date(b.date) - new Date(a.date))
    const total = all.length
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    res.json({ results: all.slice(offset, offset + parseInt(limit)), total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error('List results error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', (req, res) => {
  try {
    const result = db.get('results', parseInt(req.params.id))
    if (!result) return res.status(404).json({ error: 'Result not found' })
    res.json(result)
  } catch (err) {
    console.error('Get result error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const { date, player_a, player_b, score_a, score_b, winner, court, competition, notes } = req.body
    if (!date || !player_a || !player_b) return res.status(400).json({ error: 'Date, player A, and player B are required' })
    const result = db.insert('results', {
      date, player_a, player_b, score_a: score_a || 0, score_b: score_b || 0,
      winner: winner || '', court: court || 1, competition: competition || '', notes: notes || '', import_batch: null
    })
    res.status(201).json(result)
  } catch (err) {
    console.error('Create result error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const result = db.get('results', id)
    if (!result) return res.status(404).json({ error: 'Result not found' })
    const { date, player_a, player_b, score_a, score_b, winner, court, competition, notes } = req.body
    const updated = db.update('results', id, {
      date: date || result.date, player_a: player_a || result.player_a, player_b: player_b || result.player_b,
      score_a: score_a ?? result.score_a, score_b: score_b ?? result.score_b, winner: winner ?? result.winner,
      court: court || result.court, competition: competition ?? result.competition, notes: notes ?? result.notes
    })
    res.json(updated)
  } catch (err) {
    console.error('Update result error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    if (!db.get('results', parseInt(req.params.id))) return res.status(404).json({ error: 'Result not found' })
    db.remove('results', parseInt(req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete result error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
