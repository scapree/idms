import { useState, useEffect, createContext, useContext } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser()
          setUser(userData)
        } catch (error) {
          localStorage.removeItem('access_token')
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const formatErrorMessage = (error) => {
    const errorDetail = error.response?.data?.detail
    
    if (typeof errorDetail === 'string') {
      return errorDetail
    } else if (Array.isArray(errorDetail)) {
      // Pydantic v2 validation errors format
      return errorDetail.map(err => err.msg || err.message).join(', ')
    } else if (errorDetail && typeof errorDetail === 'object') {
      return errorDetail.msg || errorDetail.message || 'An error occurred'
    }
    
    return 'An error occurred'
  }

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password)
      localStorage.setItem('access_token', response.access_token)
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: formatErrorMessage(error) || 'Login failed'
      }
    }
  }

  const register = async (userData) => {
    try {
      await authAPI.register(userData)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: formatErrorMessage(error) || 'Registration failed'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

