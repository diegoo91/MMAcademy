import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)
router.use(requireRole('superadmin', 'admin'))

router.get('/summary', (req, res) => {
  try {
    const { from, to, preset } = req.query
    let rangeFrom = from || null
    let rangeTo = to || null
    const now = new Date()
    if (preset === 'week') {
      const d = new Date(now); d.setDate(now.getDate() - 7); rangeFrom = d.toISOString().slice(0, 10); rangeTo = now.toISOString().slice(0, 10)
    } else if (preset === 'month') {
      const d = new Date(now); d.setMonth(now.getMonth() - 1); rangeFrom = d.toISOString().slice(0, 10); rangeTo = now.toISOString().slice(0, 10)
    }

    const allBookings = db.findAll('bookings')
    let paidBookings = allBookings.filter(b => b.paid || b.status === 'confirmed' || b.status === 'completed')
    if (rangeFrom) paidBookings = paidBookings.filter(b => {
      const paidDate = b.paidAt || b.updated_at || b.created_at
      return paidDate && paidDate.slice(0, 10) >= rangeFrom
    })
    if (rangeTo) paidBookings = paidBookings.filter(b => {
      const paidDate = b.paidAt || b.updated_at || b.created_at
      return paidDate && paidDate.slice(0, 10) <= rangeTo
    })

    const payments = paidBookings.map(b => {
      const playerName = b.player_name || (b.user_id ? (db.get('users', b.user_id)?.name || 'Unknown') : 'Unknown')
      return {
        id: b.id, ref: b.ref, date: (b.paidAt || b.updated_at || b.created_at)?.slice(0, 10),
        player: playerName, amount: Number(b.amountPaid) || Number(b.total) || 0,
        session_type: b.session_type, status: b.status, paid: !!b.paid,
      }
    })

    let allSlots = db.findAll('slots')
    if (rangeFrom) allSlots = allSlots.filter(s => s.date >= rangeFrom)
    if (rangeTo) allSlots = allSlots.filter(s => s.date <= rangeTo)

    const scheduleHistory = allSlots.map(s => ({
      date: s.date, time: s.time, court: s.court, player_text: s.player_text || 'Available', booking_id: s.booking_id,
    }))

    const sessionCounts = {}
    for (const s of allSlots) {
      if (!s.player_text || s.player_text === 'Available') continue
      const names = s.player_text.split(/[/+]/).map(n => n.trim()).filter(Boolean)
      for (const name of names) {
        sessionCounts[name] = (sessionCounts[name] || 0) + 1
      }
    }
    const sessionsPerPlayer = Object.entries(sessionCounts)
      .map(([name, count]) => ({ name, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)

    let expenses = db.findAll('expenses')
    if (rangeFrom) expenses = expenses.filter(e => e.date >= rangeFrom)
    if (rangeTo) expenses = expenses.filter(e => e.date <= rangeTo)

    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

    res.json({
      payments, scheduleHistory, sessionsPerPlayer,
      profit: { revenue: totalRevenue, expenses: totalExpenses, net: totalRevenue - totalExpenses },
      range: { from: rangeFrom, to: rangeTo, preset: preset || 'custom' },
    })
  } catch (err) {
    console.error('Reports summary error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
