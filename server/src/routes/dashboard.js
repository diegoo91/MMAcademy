import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)
router.use(requireRole('superadmin', 'admin'))

router.get('/', (req, res) => {
  try {
    const totalUsers = db.count('users')
    const totalPlayers = db.count('players')
    const totalResults = db.count('results')
    const totalBookings = db.count('bookings')
    const activeBookings = db.count('bookings', b => b.status === 'confirmed')
    const totalRevenue = db.sum('bookings', 'total', b => b.status === 'confirmed')
    const totalSlots = db.count('slots')
    const occupiedSlots = db.count('slots', s => s.player_text && s.player_text.trim() !== '')
    const recentBookings = db.findAll('bookings').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(b => {
      const u = b.user_id ? db.get('users', b.user_id) : null
      return { ...b, user_name: u ? u.name : null }
    })
    const recentImports = db.findAll('import_batches').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(ib => {
      const u = ib.by_user ? db.get('users', ib.by_user) : null
      return { ...ib, user_name: u ? u.name : null }
    })
    const usersByRole = ['superadmin', 'admin', 'coach', 'player'].map(role => ({ role, count: db.count('users', u => u.role === role) }))

    const confirmedBookings = db.findAll('bookings', b => b.status === 'confirmed')
    const userCredits = {}
    for (const b of confirmedBookings) {
      if (!b.user_id) continue
      const u = db.get('users', b.user_id)
      const name = u ? u.name : b.player_name || 'Unknown'
      if (!userCredits[b.user_id]) {
        userCredits[b.user_id] = { user_id: b.user_id, name, private_remaining: 0, group_remaining: 0, bookings: [] }
      }
      userCredits[b.user_id].private_remaining += b.private_remaining || 0
      userCredits[b.user_id].group_remaining += b.group_remaining || 0
      userCredits[b.user_id].bookings.push({ ref: b.ref, private_remaining: b.private_remaining || 0, group_remaining: b.group_remaining || 0 })
    }
    const sessionCredits = Object.values(userCredits).filter(c => c.private_remaining > 0 || c.group_remaining > 0)

    res.json({
      stats: { totalUsers, totalPlayers, totalResults, totalBookings, activeBookings, totalRevenue, occupancyRate: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0 },
      recentBookings, recentImports, usersByRole, sessionCredits
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
