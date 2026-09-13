import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)

function genRef() { return 'MM-PDL-' + Math.floor(10000 + Math.random() * 90000) }

function freeSlotsForBooking(booking) {
  if (!booking.sessions_json) return
  try {
    const sessions = JSON.parse(booking.sessions_json)
    for (const s of sessions) {
      const slots = db.findAll('slots', sl => sl.date === s.date && sl.time === s.time && sl.court === parseInt(s.court))
      for (const slot of slots) {
        if (slot.booking_id === booking.id) {
          db.remove('slots', slot.id)
        }
      }
    }
  } catch (e) {
    console.error('Slot cleanup failed:', e)
  }
}

function notify(userId, kind, title, body, link) {
  if (!userId) return
  db.insert('notifications', { user_id: userId, kind, title, body, link: link || null, read: 0 })
}

router.get('/', (req, res) => {
  try {
    const { status, page = 1, limit = 50, includeCancelled } = req.query
    let all = db.findAll('bookings')
    if (req.user.role === 'player') {
      all = all.filter(b => b.user_id === req.user.id)
      if (!includeCancelled) all = all.filter(b => b.status !== 'cancelled')
    }
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
      sessions_json: JSON.stringify(sessions), total: totalPrice, status: 'pending',
      player_name: req.user?.name || null,
      private_remaining: 0,
      group_remaining: 0,
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

    const updates = { status }

    if (status === 'confirmed') {
      const sessions = booking.sessions_json ? JSON.parse(booking.sessions_json) : []
      const privateCount = booking.session_type === 'private' ? sessions.length : 0
      const groupCount = booking.session_type === 'group' ? sessions.length : 0
      updates.private_remaining = privateCount
      updates.group_remaining = groupCount

      if (booking.sessions_json) {
        try {
          const playerName = booking.player_name || 'Player'
          for (const s of sessions) {
            db.upsert('slots',
              ['date', 'time', 'court'],
              { date: s.date, time: s.time, court: s.court, player_text: playerName, booking_id: booking.id, user_id: booking.user_id }
            )
          }
        } catch (e) {
          console.error('Auto-create slots failed:', e)
        }
      }

      if (booking.user_id) {
        notify(booking.user_id, 'booking_confirmed', 'Booking Confirmed', `Your booking ${booking.ref} has been confirmed.`, '/schedule')
      }
    }

    if (status === 'cancelled') {
      freeSlotsForBooking(booking)
      updates.private_remaining = 0
      updates.group_remaining = 0

      if (booking.user_id) {
        notify(booking.user_id, 'booking_cancelled', 'Booking Cancelled', `Your booking ${booking.ref} has been cancelled.`, '/schedule')
      }
    }

    const updated = db.update('bookings', parseInt(req.params.id), updates)
    res.json(updated)
  } catch (err) {
    console.error('Update booking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/sessions', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const booking = db.get('bookings', parseInt(req.params.id))
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const { sessions, sessionType, total } = req.body
    if (!sessions || !Array.isArray(sessions)) return res.status(400).json({ error: 'Invalid sessions data' })

    const updates = {}
    updates.sessions_json = JSON.stringify(sessions)
    if (sessionType) updates.session_type = sessionType
    if (total !== undefined) updates.total = total

    if (booking.status === 'confirmed') {
      const privateCount = sessionType === 'private' ? sessions.length : 0
      const groupCount = sessionType === 'group' ? sessions.length : 0
      updates.private_remaining = privateCount
      updates.group_remaining = groupCount

      const oldSessions = JSON.parse(booking.sessions_json || '[]')
      const oldSet = new Set(oldSessions.map(s => `${s.date}|${s.time}|${s.court}`))
      const newSet = new Set(sessions.map(s => `${s.date}|${s.time}|${s.court}`))

      for (const key of oldSet) {
        if (!newSet.has(key)) {
          const [date, time, court] = key.split('|')
          const slots = db.findAll('slots', s => s.date === date && s.time === time && s.court === parseInt(court))
          for (const slot of slots) {
            if (slot.booking_id === booking.id) {
              db.remove('slots', slot.id)
            }
          }
        }
      }

      const playerName = booking.player_name || 'Player'
      for (const s of sessions) {
        db.upsert('slots',
          ['date', 'time', 'court'],
          { date: s.date, time: s.time, court: s.court, player_text: playerName, booking_id: booking.id, user_id: booking.user_id }
        )
      }
    }

    const updated = db.update('bookings', parseInt(req.params.id), updates)
    res.json(updated)
  } catch (err) {
    console.error('Edit booking sessions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/convert', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const booking = db.get('bookings', parseInt(req.params.id))
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const { from, to, count } = req.body
    if (!from || !to || !count || count <= 0) return res.status(400).json({ error: 'Invalid conversion params' })
    if (from === to) return res.status(400).json({ error: 'Cannot convert same type' })

    const privRemaining = booking.private_remaining || 0
    const groupRemaining = booking.group_remaining || 0

    if (from === 'private' && to === 'group') {
      if (privRemaining < count) return res.status(400).json({ error: `Insufficient private credits (${privRemaining} available)` })
      db.update('bookings', parseInt(req.params.id), {
        private_remaining: privRemaining - count,
        group_remaining: groupRemaining + count * 2,
      })
    } else if (from === 'group' && to === 'private') {
      if (groupRemaining < count * 2) return res.status(400).json({ error: `Insufficient group credits (${groupRemaining} available, need ${count * 2})` })
      db.update('bookings', parseInt(req.params.id), {
        group_remaining: groupRemaining - count * 2,
        private_remaining: privRemaining + count,
      })
    } else {
      return res.status(400).json({ error: 'Invalid conversion direction' })
    }

    if (booking.user_id) {
      notify(booking.user_id, 'conversion_approved', 'Credits Converted', `Your ${count} ${from} session(s) have been converted to ${from === 'private' ? count * 2 : count} ${to} session(s).`, '/profile')
    }

    const updated = db.get('bookings', parseInt(req.params.id))
    res.json(updated)
  } catch (err) {
    console.error('Convert booking credits error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/pay', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const booking = db.get('bookings', parseInt(req.params.id))
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const amount = req.body.amount !== undefined ? Number(req.body.amount) : Number(booking.total)
    if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'Invalid amount' })
    const updated = db.update('bookings', parseInt(req.params.id), {
      paid: 1,
      amountPaid: amount,
      paidAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    res.json(updated)
  } catch (err) {
    console.error('Mark booking paid error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const booking = db.get('bookings', parseInt(req.params.id))
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    if (booking.status === 'confirmed') {
      freeSlotsForBooking(booking)
    }

    db.remove('bookings', parseInt(req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete booking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
