import bcrypt from 'bcryptjs'
import db from './database.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mmpadel.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin'

const existing = db.find('users', u => u.email === ADMIN_EMAIL)
if (existing) {
  console.log(`Admin ${ADMIN_EMAIL} already exists (id=${existing.id}). Updating...`)
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12)
  db.update('users', existing.id, { password_hash: hash, role: 'superadmin', force_password_change: 1 })
  console.log('Admin updated.')
} else {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12)
  const user = db.insert('users', {
    name: ADMIN_NAME, email: ADMIN_EMAIL, phone: '', dob: '',
    password_hash: hash, role: 'superadmin', skill_level: 'Intermediate',
    member_since: new Date().getFullYear().toString(), force_password_change: 1
  })
  console.log(`Admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (id=${user.id})`)
}

const demoPlayers = [
  { full_name: 'Zain', email: 'zain@demo.com', phone: '+201000000001', skill_level: 'Intermediate' },
  { full_name: 'Farida Fathallah', email: 'farida@demo.com', phone: '+201000000002', skill_level: 'Advanced' },
  { full_name: 'Ahmed Saleh', email: 'ahmed@demo.com', phone: '+201000000003', skill_level: 'Beginner' },
  { full_name: 'Hassan Medhat', email: 'hassan@demo.com', phone: '+201000000004', skill_level: 'Intermediate' },
  { full_name: 'Totos', email: 'totos@demo.com', phone: '+201000000005', skill_level: 'Advanced' },
  { full_name: 'Ashraf', email: 'ashraf@demo.com', phone: '+201000000006', skill_level: 'Intermediate' },
  { full_name: 'Yasin Fathallah', email: 'yasin@demo.com', phone: '+201000000007', skill_level: 'Advanced' },
  { full_name: 'Aley', email: 'aley@demo.com', phone: '+201000000008', skill_level: 'Intermediate' },
  { full_name: 'Ismail', email: 'ismail@demo.com', phone: '+201000000009', skill_level: 'Beginner' },
  { full_name: 'Sharaf', email: 'sharaf@demo.com', phone: '+201000000010', skill_level: 'Intermediate' },
]

let seeded = 0
for (const p of demoPlayers) {
  if (!db.find('players', pl => pl.email === p.email)) {
    db.insert('players', { ...p, dob: '', notes: '' })
    seeded++
  }
}
console.log(`Seeded ${seeded} demo players.`)

const TODAY = new Date()
const dow = TODAY.getDay()
const sunday = new Date(TODAY)
sunday.setDate(TODAY.getDate() - dow)
function fmt(d) { return d.toISOString().slice(0, 10) }

const TIMES = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
const allPlayerNames = db.findAll('players').map(p => p.full_name)

let slotsCreated = 0
for (let d = 0; d < 5; d++) {
  const date = new Date(sunday)
  date.setDate(sunday.getDate() + d)
  const dateStr = fmt(date)
  for (const time of TIMES) {
    if (Math.random() > 0.4) {
      db.insert('slots', { date: dateStr, time, court: 1, player_text: allPlayerNames[Math.floor(Math.random() * allPlayerNames.length)], booking_id: null })
      slotsCreated++
    }
    if (Math.random() > 0.5) {
      db.insert('slots', { date: dateStr, time, court: 2, player_text: allPlayerNames[Math.floor(Math.random() * allPlayerNames.length)], booking_id: null })
      slotsCreated++
    }
  }
}
console.log(`Seeded ${slotsCreated} slots for this week.`)
console.log('Seed complete.')
