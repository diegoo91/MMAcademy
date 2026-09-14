import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import playersRoutes from './routes/players.js'
import resultsRoutes from './routes/results.js'
import slotsRoutes from './routes/slots.js'
import bookingsRoutes from './routes/bookings.js'
import importsRoutes from './routes/imports.js'
import dashboardRoutes from './routes/dashboard.js'
import commentsRoutes from './routes/comments.js'
import notificationsRoutes from './routes/notifications.js'
import conversionRequestsRoutes from './routes/conversion-requests.js'
import expensesRoutes from './routes/expenses.js'
import reportsRoutes from './routes/reports.js'
import bookingRequestsRoutes from './routes/booking-requests.js'
import paymentsRoutes from './routes/payments.js'

const app = express()
const PORT = process.env.PORT || 5174

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5175', 'http://127.0.0.1:5173'], credentials: true }))
app.use(express.json({ limit: '5mb' }))
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })
app.use('/api', limiter)

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/players', playersRoutes)
app.use('/api/results', resultsRoutes)
app.use('/api/slots', slotsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/imports', importsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/comments', commentsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/conversion-requests', conversionRequestsRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/booking-requests', bookingRequestsRoutes)
app.use('/api/payments', paymentsRoutes)

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`MM Padel Academy API running on http://localhost:${PORT}`)
})
