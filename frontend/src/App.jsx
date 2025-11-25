import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthProvider } from './hooks/useAuth.jsx'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import InvitePage from './pages/InvitePage'
import LoadingSpinner from './components/LoadingSpinner'

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner text="Initializing application..." />
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <DashboardPage /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/project/:projectId" 
          element={user ? <ProjectPage /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/invite/:token" 
          element={<InvitePage />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
