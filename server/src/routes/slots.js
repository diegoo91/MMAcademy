import { Router } from 'express'
import db from '../database.js'
import { authenticate, optionalAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()

router.get('/', optionalAuth, (req, res) => {
  try {
    const { from, to, court } = req.query
    let all = db.findAll('slots')
    if (from) all = all.filter(s => s.date >= from)
    if (to) all = all.filter(s => s.date <= to)
    if (court) all = all.filter(s => s.court === parseInt(court))
    all.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.court - b.court)
    res.json(all)
  } catch (err) {
    console.error('List slots error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.use(authenticate)

router.put('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const slot = db.get('slots', id)
    if (!slot) return res.status(404).json({ error: 'Slot not found' })
    const { player_text, date, time, court, session_type, status } = req.body
    const newDate = date || slot.date
    const newTime = time || slot.time
    const newCourt = court || slot.court
    const conflict = db.find('slots', s => s.id !== id && s.date === newDate && s.time === newTime && s.court === newCourt)
    if (conflict) return res.status(409).json({ error: 'Slot already exists at this date/time/court' })

    const updates = {
      player_text: player_text ?? slot.player_text,
      date: newDate, time: newTime, court: newCourt,
      session_type: session_type !== undefined ? session_type : slot.session_type,
      status: status || slot.status
    }

    if (player_text !== undefined) {
      updates.status = player_text?.trim() ? (updates.status === 'pending' ? 'pending' : 'confirmed') : 'available'
    }

    const updated = db.update('slots', id, updates)

    if (session_type !== undefined && session_type !== slot.session_type && slot.booking_id) {
      const booking = db.get('bookings', slot.booking_id)
      if (booking) {
        db.update('bookings', booking.id, { session_type })
      }
    }

    res.json(updated)
  } catch (err) {
    console.error('Update slot error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const { date, time, court, player_text, session_type } = req.body
    if (!date || !time || !court) return res.status(400).json({ error: 'Date, time, and court are required' })
    if (db.find('slots', s => s.date === date && s.time === time && s.court === court)) return res.status(409).json({ error: 'Slot already exists' })
    const status = player_text?.trim() ? 'confirmed' : 'available'
    const slot = db.insert('slots', { date, time, court, player_text: player_text || '', session_type: session_type || null, status, booking_id: null })
    res.status(201).json(slot)
  } catch (err) {
    console.error('Create slot error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    if (!db.get('slots', parseInt(req.params.id))) return res.status(404).json({ error: 'Slot not found' })
    db.remove('slots', parseInt(req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete slot error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
