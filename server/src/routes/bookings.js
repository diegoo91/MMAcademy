import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)

function genRef() { return 'MM-PDL-' + Math.floor(10000 + Math.random() * 90000) }

router.get('/', (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query
    let all = db.findAll('bookings')
    if (req.user.role === 'player') all = all.filter(b => b.user_id === req.user.id)
    if (status) all = all.filter(b => b.status === status)
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const total = all.length
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    const bookings = all.slice(offset, offset + parseInt(limit)).map(b => {
      const u = b.user_id ? db.get('users', b.user_id) : null
      return { ...b, user_name: u ? u.name : null }
    })
    res.json({ bookings, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error('List bookings error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', (req, res) => {
  try {
    const { sessionType, mode, sessions, totalPrice } = req.body
    if (!sessionType || !sessions || !totalPrice) return res.status(400).json({ error: 'Missing booking data' })
    let ref = genRef()
    while (db.find('bookings', b => b.ref === ref)) ref = genRef()
    const booking = db.insert('bookings', {
      ref, user_id: req.user?.id || null, session_type: sessionType, mode,
      sessions_json: JSON.stringify(sessions), total: totalPrice, status: 'confirmed'
    })
    res.status(201).json(booking)
  } catch (err) {
    console.error('Create booking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/status', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const { status } = req.body
    const valid = ['confirmed', 'cancelled', 'completed']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const booking = db.get('bookings', parseInt(req.params.id))
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const updated = db.update('bookings', parseInt(req.params.id), { status })
    res.json(updated)
  } catch (err) {
    console.error('Update booking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
