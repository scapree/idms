import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth.jsx'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    setIsLoading(true)
    const result = await registerUser(data)
    setIsLoading(false)
    
    if (result.success) {
      toast.success('Регистрация успешна! Войдите в систему.')
      // Pass along the redirect URL if it exists
      const from = location.state?.from
      navigate('/login', from ? { state: { from } } : {})
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 overflow-auto">
      <div className="max-w-sm w-full py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Создание аккаунта
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Или{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                войдите в существующий
              </Link>
            </p>
          </div>
          
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Имя пользователя
              </label>
              <input
                {...register('username', { 
                  required: 'Введите имя пользователя',
                  minLength: { value: 3, message: 'Минимум 3 символа' }
                })}
                type="text"
                className="input"
                placeholder="Придумайте имя пользователя"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                {...register('email', { 
                  required: 'Введите email',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Некорректный email адрес'
                  }
                })}
                type="email"
                className="input"
                placeholder="Введите email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  {...register('password', { 
                    required: 'Введите пароль',
                    minLength: { value: 6, message: 'Минимум 6 символов' }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Придумайте пароль"
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
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Подтверждение пароля
              </label>
              <input
                {...register('confirmPassword', { 
                  required: 'Подтвердите пароль',
                  validate: value => value === password || 'Пароли не совпадают'
                })}
                type="password"
                className="input"
                placeholder="Повторите пароль"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-md w-full mt-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Создать аккаунт
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage

