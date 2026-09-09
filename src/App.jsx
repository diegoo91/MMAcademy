import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import SignUp from './pages/SignUp'
import Schedule from './pages/Schedule'
import Book from './pages/Book'
import Payment from './pages/Payment'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Players from './pages/admin/Players'
import Results from './pages/admin/Results'
import Users from './pages/admin/Users'
import Imports from './pages/admin/Imports'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/book" element={<Book />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={
          <ProtectedRoute roles={['superadmin', 'admin', 'coach']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="players" element={<Players />} />
          <Route path="results" element={<Results />} />
          <Route path="users" element={
            <ProtectedRoute roles={['superadmin', 'admin']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="imports" element={<Imports />} />
        </Route>

        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
