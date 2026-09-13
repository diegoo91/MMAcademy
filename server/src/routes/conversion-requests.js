import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)

function notify(userId, kind, title, body, link) {
  if (!userId) return
  db.insert('notifications', { user_id: userId, kind, title, body, link: link || null, read: 0 })
}

router.post('/', (req, res) => {
  try {
    if (req.user.role !== 'player' && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only players can submit conversion requests' })
    }
    const { booking_id, from, to, count } = req.body
    if (!from || !to || !count || count <= 0) return res.status(400).json({ error: 'Invalid request params' })
    if (from === to) return res.status(400).json({ error: 'Cannot convert same type' })

    const booking = db.get('bookings', parseInt(booking_id))
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.user_id !== req.user.id && req.user.role === 'player') return res.status(403).json({ error: 'Not your booking' })

    const privRemaining = booking.private_remaining || 0
    const groupRemaining = booking.group_remaining || 0

    if (from === 'private' && count > privRemaining) return res.status(400).json({ error: `Insufficient private credits (${privRemaining} available)` })
    if (from === 'group' && count * 2 > groupRemaining) return res.status(400).json({ error: `Insufficient group credits (${groupRemaining} available, need ${count * 2})` })

    const admins = db.findAll('users', u => u.role === 'superadmin' || u.role === 'admin')
    const request = db.insert('conversion_requests', {
      booking_id: booking.id,
      user_id: req.user.id,
      user_name: req.user.name,
      from,
      to,
      count: parseInt(count),
      status: 'pending',
    })

    for (const admin of admins) {
      notify(admin.id, 'conversion_request', 'Conversion Request', `${req.user.name} requests to convert ${count} ${from} → ${to}.`, '/admin/bookings')
    }

    res.status(201).json(request)
  } catch (err) {
    console.error('Create conversion request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const { status } = req.query
    let all = db.findAll('conversion_requests')
    if (status) all = all.filter(r => r.status === status)
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    res.json(all)
  } catch (err) {
    console.error('List conversion requests error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/approve', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const request = db.get('conversion_requests', parseInt(req.params.id))
    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' })

    const booking = db.get('bookings', request.booking_id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const privRemaining = booking.private_remaining || 0
    const groupRemaining = booking.group_remaining || 0

    if (request.from === 'private' && request.to === 'group') {
      if (privRemaining < request.count) return res.status(400).json({ error: 'Insufficient credits' })
      db.update('bookings', booking.id, {
        private_remaining: privRemaining - request.count,
        group_remaining: groupRemaining + request.count * 2,
      })
    } else if (request.from === 'group' && request.to === 'private') {
      if (groupRemaining < request.count * 2) return res.status(400).json({ error: 'Insufficient credits' })
      db.update('bookings', booking.id, {
        group_remaining: groupRemaining - request.count * 2,
        private_remaining: privRemaining + request.count,
      })
    }

    db.update('conversion_requests', parseInt(req.params.id), { status: 'approved' })

    if (request.user_id) {
      notify(request.user_id, 'conversion_approved', 'Conversion Approved', `Your request to convert ${request.count} ${request.from} → ${request.to} has been approved.`, '/profile')
    }

    const updated = db.get('conversion_requests', parseInt(req.params.id))
    res.json(updated)
  } catch (err) {
    console.error('Approve conversion request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/reject', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const request = db.get('conversion_requests', parseInt(req.params.id))
    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' })

    db.update('conversion_requests', parseInt(req.params.id), { status: 'rejected' })

    if (request.user_id) {
      notify(request.user_id, 'conversion_rejected', 'Conversion Rejected', `Your request to convert ${request.count} ${request.from} → ${request.to} has been rejected.`, '/profile')
    }

    const updated = db.get('conversion_requests', parseInt(req.params.id))
    res.json(updated)
  } catch (err) {
    console.error('Reject conversion request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
