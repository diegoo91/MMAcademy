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

function updateUserBalance(userId, newPriv, newGrp) {
  const now = new Date().toISOString()
  const bothZero = newPriv <= 0 && newGrp <= 0
  const updates = { private_balance: newPriv, group_balance: newGrp }
  if (bothZero) {
    updates.balance_zero_since = now
  } else {
    updates.balance_zero_since = null
  }
  db.update('users', userId, updates)
}

// List requests (admin sees all, player sees own)
router.get('/', (req, res) => {
  try {
    const { status, kind, slot_id } = req.query
    let all = db.findAll('booking_requests')
    if (req.user.role === 'player') {
      all = all.filter(r => r.player_id === req.user.id)
    }
    if (status) all = all.filter(r => r.status === status)
    if (kind) all = all.filter(r => r.kind === kind)
    if (slot_id) all = all.filter(r => r.slot_id === parseInt(slot_id))
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    res.json(all)
  } catch (err) {
    console.error('List booking requests error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Player responds to attendance confirm (Yes → confirmed, No → opens cancel/modify)
router.put('/:id/respond', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const request = db.get('booking_requests', id)
    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (request.player_id !== req.user.id) return res.status(403).json({ error: 'Not your request' })
    if (request.kind !== 'attendance_confirm' || request.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid request state' })
    }

    const { response } = req.body
    if (response === 'yes') {
      db.update('booking_requests', id, { status: 'confirmed', decided_at: new Date().toISOString() })
      res.json({ ok: true, message: 'Attendance confirmed' })
    } else if (response === 'no') {
      db.update('booking_requests', id, { status: 'denied', decided_at: new Date().toISOString() })
      res.json({ ok: true, message: 'Please submit a cancel or modify request' })
    } else {
      return res.status(400).json({ error: 'Response must be yes or no' })
    }
  } catch (err) {
    console.error('Respond to request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Player submits cancel or modify request
router.post('/', (req, res) => {
  try {
    const { kind, slot_id, booking_id, payload } = req.body
    if (!kind || !slot_id) return res.status(400).json({ error: 'kind and slot_id are required' })
    if (!['cancel', 'modify'].includes(kind)) return res.status(400).json({ error: 'kind must be cancel or modify' })

    const slot = db.get('slots', parseInt(slot_id))
    if (!slot) return res.status(404).json({ error: 'Slot not found' })

    const request = db.insert('booking_requests', {
      kind,
      slot_id: parseInt(slot_id),
      booking_id: booking_id || slot.booking_id || null,
      player_id: req.user.id,
      player_name: req.user.name,
      payload: payload || {},
      status: 'pending',
    })

    const admins = db.findAll('users', u => u.role === 'superadmin' || u.role === 'admin')
    for (const admin of admins) {
      notify(admin.id, `request_${kind}`,
        kind === 'cancel' ? 'Cancellation Requested' : 'Modification Requested',
        `${req.user.name} requested to ${kind} their slot on ${slot.date} at ${slot.time}.`,
        '/admin/bookings'
      )
    }

    res.status(201).json(request)
  } catch (err) {
    console.error('Create request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Admin approves/denies a request
router.put('/:id/decide', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const request = db.get('booking_requests', id)
    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already decided' })

    const { decision, proposed_date, proposed_time, proposed_court } = req.body
    if (!['approved', 'denied'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or denied' })

    const slot = db.get('slots', request.slot_id)

    if (decision === 'approved') {
      if (request.kind === 'cancel') {
        if (slot) {
          db.update('slots', slot.id, { player_text: '', status: 'available', booking_id: null, session_type: null })
        }
        if (request.booking_id) {
          const booking = db.get('bookings', request.booking_id)
          if (booking && booking.user_id) {
            const user = db.get('users', booking.user_id)
            if (user && booking.deducted_from) {
              const count = booking.deducted_count || (booking.sessions_json ? JSON.parse(booking.sessions_json).length : 0)
              if (booking.deducted_from === 'private') {
                updateUserBalance(user.id, (user.private_balance || 0) + count, user.group_balance || 0)
              } else if (booking.deducted_from === 'group') {
                updateUserBalance(user.id, user.private_balance || 0, (user.group_balance || 0) + count)
              }
            }
            db.update('bookings', booking.id, { status: 'cancelled', private_remaining: 0, group_remaining: 0 })
            notify(booking.user_id, 'request_approved', 'Request Approved',
              `Your cancellation request for ${slot?.date} ${slot?.time} has been approved.`, '/schedule')
          }
        }
      } else if (request.kind === 'modify') {
        if (slot && proposed_date && proposed_time) {
          const newCourt = proposed_court || slot.court
          const conflict = db.find('slots', s => s.date === proposed_date && s.time === proposed_time && s.court === newCourt && s.id !== slot.id)
          if (conflict) {
            return res.status(409).json({ error: 'Target slot is already occupied' })
          }
          db.update('slots', slot.id, { date: proposed_date, time: proposed_time, court: newCourt })
        }
        if (request.booking_id) {
          const booking = db.get('bookings', request.booking_id)
          if (booking && booking.user_id) {
            notify(booking.user_id, 'request_approved', 'Modification Approved',
              `Your slot has been moved to ${proposed_date} ${proposed_time}.`, '/schedule')
          }
        }
      } else if (request.kind === 'new_booking') {
        if (slot) {
          db.update('slots', slot.id, { status: 'confirmed' })
        }
        if (request.booking_id) {
          const booking = db.get('bookings', request.booking_id)
          if (booking) {
            db.update('bookings', booking.id, { status: 'confirmed' })
            if (booking.sessions_json) {
              try {
                const sessions = JSON.parse(booking.sessions_json)
                const playerName = booking.player_name || 'Player'
                for (const s of sessions) {
                  db.upsert('slots', ['date', 'time', 'court'], {
                    date: s.date, time: s.time, court: s.court,
                    player_text: playerName, booking_id: booking.id,
                    user_id: booking.user_id, session_type: booking.session_type,
                    status: 'confirmed'
                  })
                }
                if (booking.user_id) {
                  const user = db.get('users', booking.user_id)
                  if (user) {
                    const sessionCount = sessions.length
                    if (booking.session_type === 'private') {
                      updateUserBalance(user.id, (user.private_balance || 0) - sessionCount, user.group_balance || 0)
                      db.update('bookings', booking.id, { deducted_from: 'private', deducted_count: sessionCount })
                    } else if (booking.session_type === 'group') {
                      let newPriv = user.private_balance || 0
                      let newGrp = user.group_balance || 0
                      let sessionsLeft = sessionCount
                      const useGroup = Math.min(newGrp, sessionsLeft)
                      newGrp -= useGroup
                      sessionsLeft -= useGroup
                      if (sessionsLeft > 0) {
                        const conv = Math.ceil(sessionsLeft / 2)
                        newPriv -= conv
                        newGrp += conv * 2
                        sessionsLeft -= conv * 2
                      }
                      updateUserBalance(user.id, newPriv, newGrp)
                      db.update('bookings', booking.id, { deducted_from: 'group', deducted_count: sessionCount })
                    }
                  }
                }
              } catch (e) { console.error('Slot creation failed:', e) }
            }
            if (booking.user_id) {
              notify(booking.user_id, 'booking_confirmed', 'Booking Confirmed',
                `Your booking ${booking.ref} has been confirmed.`, '/schedule')
            }
          }
        }
      } else if (request.kind === 'reschedule_offer') {
        if (slot && proposed_date && proposed_time) {
          const conflict = db.find('slots', s => s.date === proposed_date && s.time === proposed_time && s.court === (proposed_court || slot.court) && s.id !== slot.id)
          if (conflict) {
            return res.status(409).json({ error: 'Proposed slot is already occupied' })
          }
        }
        if (request.player_id) {
          notify(request.player_id, 'reschedule_offer', 'New Time Proposed',
            `Admin proposed ${proposed_date} ${proposed_time} for your slot. Please confirm or deny.`, '/profile')
        }
      }
    } else {
      if (request.kind === 'new_booking') {
        if (slot) {
          db.update('slots', slot.id, { status: 'available', player_text: '' })
        }
        if (request.booking_id) {
          const booking = db.get('bookings', request.booking_id)
          if (booking && booking.user_id) {
            notify(booking.user_id, 'booking_cancelled', 'Booking Denied',
              `Your booking request for ${slot?.date} ${slot?.time} was not approved.`, '/book')
          }
        }
      } else {
        if (request.player_id) {
          notify(request.player_id, 'request_denied', 'Request Denied',
            `Your ${request.kind} request for ${slot?.date} ${slot?.time} was denied.`, '/schedule')
        }
      }
    }

    const updated = db.update('booking_requests', id, {
      status: decision,
      decided_by: req.user.id,
      decided_at: new Date().toISOString(),
      payload: { ...request.payload, proposed_date, proposed_time, proposed_court },
    })
    res.json(updated)
  } catch (err) {
    console.error('Decide request error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
