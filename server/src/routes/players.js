import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)

router.get('/', (req, res) => {
  try {
    const { search, skill, page = 1, limit = 50 } = req.query
    const all = db.findAll('players')
    const allSlots = db.findAll('slots')
    let filtered = all
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(p => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone && p.phone.includes(q)))
    }
    if (skill) filtered = filtered.filter(p => p.skill_level === skill)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const total = filtered.length
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    const players = filtered.slice(offset, offset + parseInt(limit)).map(p => {
      const sessions = allSlots.filter(s => {
        if (!s.player_text) return false
        const names = s.player_text.split(/[/+]/).map(n => n.trim().toLowerCase())
        return names.includes(p.full_name.toLowerCase())
      }).length
      return { ...p, remaining_sessions: sessions }
    })
    res.json({ players, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error('List players error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/sessions', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const player = db.get('players', id)
    if (!player) return res.status(404).json({ error: 'Player not found' })
    const playerName = player.full_name.toLowerCase()
    const allSlots = db.findAll('slots')
    const sessions = allSlots
      .filter(s => {
        if (!s.player_text) return false
        const names = s.player_text.split(/[/+]/).map(n => n.trim().toLowerCase())
        return names.includes(playerName)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .map(s => {
        const booking = s.booking_id ? db.get('bookings', s.booking_id) : null
        return {
          date: s.date, time: s.time, court: s.court,
          session_type: booking ? booking.session_type : null,
          paid: booking ? !!booking.paid : null,
          booking_ref: booking ? booking.ref : null,
        }
      })
    res.json({ player: { id: player.id, full_name: player.full_name }, sessions })
  } catch (err) {
    console.error('Player sessions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', (req, res) => {
  try {
    const player = db.get('players', parseInt(req.params.id))
    if (!player) return res.status(404).json({ error: 'Player not found' })
    res.json(player)
  } catch (err) {
    console.error('Get player error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const { full_name, email, phone, dob, skill_level, notes } = req.body
    if (!full_name || !email) return res.status(400).json({ error: 'Full name and email are required' })
    if (db.find('players', p => p.email === email)) return res.status(409).json({ error: 'Email already exists' })
    const validSkills = ['Beginner', 'Intermediate', 'Advanced']
    if (skill_level && !validSkills.includes(skill_level)) return res.status(400).json({ error: 'Invalid skill level' })
    const player = db.insert('players', { full_name, email, phone: phone || '', dob: dob || '', skill_level: skill_level || 'Intermediate', notes: notes || '' })
    res.status(201).json(player)
  } catch (err) {
    console.error('Create player error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const player = db.get('players', id)
    if (!player) return res.status(404).json({ error: 'Player not found' })
    const { full_name, email, phone, dob, skill_level, notes } = req.body
    const validSkills = ['Beginner', 'Intermediate', 'Advanced']
    if (skill_level && !validSkills.includes(skill_level)) return res.status(400).json({ error: 'Invalid skill level' })
    const updated = db.update('players', id, {
      full_name: full_name || player.full_name,
      email: email || player.email,
      phone: phone ?? player.phone,
      dob: dob ?? player.dob,
      skill_level: skill_level || player.skill_level,
      notes: notes ?? player.notes
    })
    res.json(updated)
  } catch (err) {
    console.error('Update player error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    if (!db.get('players', parseInt(req.params.id))) return res.status(404).json({ error: 'Player not found' })
    db.remove('players', parseInt(req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete player error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
