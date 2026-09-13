import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = Router()
router.use(authenticate)

router.get('/', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const users = db.query('users', { orderBy: (a, b) => new Date(b.created_at) - new Date(a.created_at) })
      .map(({ password_hash, ...u }) => u)
    res.json(users)
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireRole('superadmin'), (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' })
    const validRoles = ['superadmin', 'admin', 'coach', 'player']
    if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' })
    if (db.find('users', u => u.email === email)) return res.status(409).json({ error: 'Email already exists' })
    const hash = bcrypt.hashSync(password, 12)
    const user = db.insert('users', { name, email, phone: phone || '', role: role || 'player', password_hash: hash, member_since: new Date().getFullYear().toString(), force_password_change: 0, skill_level: 'Intermediate', dob: '' })
    const { password_hash, ...safe } = user
    res.status(201).json(safe)
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const user = db.get('users', id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const { name, email, phone, role, skill_level, permissions } = req.body
    const validRoles = ['superadmin', 'admin', 'coach', 'player']
    if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' })
    if (role && role !== user.role && user.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' })
    const updates = { name: name || user.name, email: email || user.email, phone: phone ?? user.phone, role: role || user.role, skill_level: skill_level || user.skill_level }
    if (req.user.role === 'superadmin' && Array.isArray(permissions)) {
      updates.permissions = permissions
    }
    const updated = db.update('users', id, updates)
    const { password_hash, ...safe } = updated
    res.json(safe)
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireRole('superadmin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })
    if (!db.get('users', id)) return res.status(404).json({ error: 'User not found' })
    db.remove('users', id)
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/reset-password', requireRole('superadmin', 'admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!db.get('users', id)) return res.status(404).json({ error: 'User not found' })
    const tempPass = 'ChangeMe' + Math.floor(1000 + Math.random() * 9000)
    const hash = bcrypt.hashSync(tempPass, 12)
    db.update('users', id, { password_hash: hash, force_password_change: 1 })
    res.json({ ok: true, tempPassword: tempPass })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
