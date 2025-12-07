import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { LogOut, User, Info, X, GraduationCap, Code, TestTube, Crown } from 'lucide-react'

// Модальное окно "О проекте"
const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const creators = [
    {
      name: 'Трунова Татьяна',
      role: 'Teamlead, Backend developer',
      icon: Crown,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      name: 'Немчинов Валентин',
      role: 'Frontend developer',
      icon: Code,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      name: 'Михеева Татьяна',
      role: 'Tester',
      icon: TestTube,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-xl border border-gray-200 w-full max-w-md overflow-hidden pointer-events-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 bg-white border-b border-gray-100 text-gray-900">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-primary-50 rounded-xl">
                <Info className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">О проекте</h2>
                <p className="text-sm text-gray-500">IDMS v1.0</p>
              </div>
            </div>
            
            <p className="text-sm leading-relaxed text-gray-600">
              Интегрированная система моделирования диаграмм
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* University Info */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="p-2 bg-primary-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Колледж программирования и кибербезопасности
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  РТУ МИРЭА
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Группа ЩПКО-01-23
                </p>
              </div>
            </div>

            {/* Creators */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Создатели проекта
              </h3>
              <div className="space-y-2.5">
                {creators.map((creator, index) => {
                  const IconComponent = creator.icon
                  return (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${creator.bgColor} ${creator.borderColor}`}
                    >
                      <div className={`p-2 bg-white rounded-lg shadow-sm`}>
                        <IconComponent className={`w-4 h-4 ${creator.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {creator.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {creator.role}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              © 2024-2025 • Все права защищены
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const [showAbout, setShowAbout] = useState(false)

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">IDMS</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAbout(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="О проекте"
              >
                <Info className="h-4 w-4" />
                <span>О проекте</span>
              </button>
              
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              
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

