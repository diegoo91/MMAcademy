import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import db from '../database.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken, cookieOptions } from '../utils/tokens.js'
import { authenticate } from '../middleware/auth.js'
import { getUserPermissions } from '../middleware/rbac.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const profileStorage = multer.diskStorage({
  destination: join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `profile_${req.user.id}${extname(file.originalname)}`)
})
const profileUpload = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()

router.post('/signup', (req, res) => {
  try {
    const { name, email, phone, dob, password, skillLevel } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' })
    if (db.find('users', u => u.email === email)) return res.status(409).json({ error: 'Email already registered' })
    const hash = bcrypt.hashSync(password, 12)
    const memberSince = new Date().getFullYear().toString()
    const user = db.insert('users', { name, email, phone: phone || '', dob: dob || '', password_hash: hash, role: 'player', skill_level: skillLevel || 'Intermediate', member_since: memberSince, force_password_change: 0 })
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role, skill_level: user.skill_level, force_password_change: 0 }
    const accessToken = signAccessToken(safe)
    const refreshToken = signRefreshToken(safe)
    res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))
    res.json({ user: safe, accessToken })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const user = db.find('users', u => u.email === email)
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' })
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role, skill_level: user.skill_level, force_password_change: user.force_password_change, permissions: getUserPermissions(user) }
    const accessToken = signAccessToken(safe)
    const refreshToken = signRefreshToken(safe)
    res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))
    res.json({ user: safe, accessToken })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/refresh', (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ error: 'No refresh token' })
    const payload = verifyRefreshToken(token)
    const user = db.get('users', payload.id)
    if (!user) return res.status(401).json({ error: 'User not found' })
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role, skill_level: user.skill_level, force_password_change: user.force_password_change, permissions: getUserPermissions(user) }
    const accessToken = signAccessToken(safe)
    const newRefresh = signRefreshToken(safe)
    res.cookie('refreshToken', newRefresh, cookieOptions(7 * 24 * 60 * 60 * 1000))
    res.json({ user: safe, accessToken })
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', { path: '/' })
  res.json({ ok: true })
})

router.get('/me', authenticate, (req, res) => {
  const user = db.get('users', req.user.id)
  const permissions = user ? getUserPermissions(user) : []
  res.json({ user: { ...req.user, permissions } })
})

router.post('/change-password', authenticate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' })
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })
    const user = db.get('users', req.user.id)
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Current password is incorrect' })
    const hash = bcrypt.hashSync(newPassword, 12)
    db.update('users', req.user.id, { password_hash: hash, force_password_change: 0 })
    res.json({ ok: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, phone, skill_level } = req.body
    const updates = {}
    if (name) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (skill_level) updates.skill_level = skill_level
    const user = db.update('users', req.user.id, updates)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const { password_hash, ...safe } = user
    res.json(safe)
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/avatar', authenticate, profileUpload.single('avatar'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const avatarPath = `/uploads/profile_${req.user.id}${extname(req.file.originalname)}`
    db.update('users', req.user.id, { avatar: avatarPath })
    res.json({ avatar: avatarPath })
  } catch (err) {
    console.error('Upload avatar error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
