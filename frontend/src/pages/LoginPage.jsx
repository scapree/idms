import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth.jsx'
import { Eye, EyeOff, LogIn, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const { login, loginAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setIsLoading(true)
    const result = await login(data.username, data.password)
    setIsLoading(false)
    
    if (result.success) {
      toast.success('Вход выполнен успешно!')
      const from = location.state?.from || '/dashboard'
      navigate(from)
    } else {
      toast.error(result.error)
    }
  }

  const handleGuestLogin = async () => {
    setIsGuestLoading(true)
    const result = await loginAsGuest()
    setIsGuestLoading(false)

    if (result.success) {
      toast.success('Вы вошли как гость')
      navigate('/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Вход в IDMS
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Или{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                создайте новый аккаунт
              </Link>
            </p>
          </div>
          
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Имя пользователя
              </label>
              <input
                {...register('username', { required: 'Введите имя пользователя' })}
                type="text"
                className="input"
                placeholder="Введите имя пользователя"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Введите пароль' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isGuestLoading}
              className="btn btn-primary btn-md w-full mt-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Войти
                </>
              )}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-3 text-xs text-gray-400 whitespace-nowrap">или</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading || isGuestLoading}
              className="btn btn-md w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
            >
              {isGuestLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
              ) : (
                <>
                  <UserRound className="h-4 w-4 mr-2" />
                  Войти как гость
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              Данные сохраняются до закрытия вкладки
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

