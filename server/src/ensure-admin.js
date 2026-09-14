// Boot-time admin ensure: creates or updates the admin account from env vars.
// This is NON-DESTRUCTIVE — it only touches the admin user, never wipes slots/data.
// Used on Railway so a login is always available after a fresh deploy.

import bcrypt from 'bcryptjs'
import db from './database.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mmpadel.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin'

export function ensureAdmin() {
  if (!ADMIN_PASSWORD) {
    console.log('ensure-admin: skipped (ADMIN_PASSWORD not set)')
    return
  }

  const existing = db.find('users', u => u.email === ADMIN_EMAIL)
  if (existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12)
    db.update('users', existing.id, { password_hash: hash, role: 'superadmin', name: ADMIN_NAME })
    console.log(`ensure-admin: updated ${ADMIN_EMAIL} (id=${existing.id})`)
  } else {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12)
    const user = db.insert('users', {
      name: ADMIN_NAME, email: ADMIN_EMAIL, phone: '', dob: '',
      password_hash: hash, role: 'superadmin', skill_level: 'Intermediate',
      member_since: new Date().getFullYear().toString(),
      force_password_change: 0,
      notes: '', private_balance: 0, group_balance: 0, is_claimed: true,
      member_code: '001',
    })
    console.log(`ensure-admin: created ${ADMIN_EMAIL} (id=${user.id})`)
  }
}
