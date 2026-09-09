import { Router } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

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
    res.json({
      stats: { totalUsers, totalPlayers, totalResults, totalBookings, activeBookings, totalRevenue, occupancyRate: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0 },
      recentBookings, recentImports, usersByRole
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
