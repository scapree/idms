import React from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { LogOut, User, Settings } from 'lucide-react'

const Layout = ({ children }) => {
  const { user, logout } = useAuth()

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">IDMS</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 font-medium">{user?.username}</span>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout

