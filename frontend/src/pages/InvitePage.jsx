import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { projectsAPI } from '../api'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const InvitePage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Fetch invite info
  const { data: inviteInfo, isLoading, error } = useQuery(
    ['invite', token],
    () => projectsAPI.getInviteInfo(token),
    {
      enabled: !!token,
      retry: false,
    }
  )

  // Accept invite mutation
  const acceptInviteMutation = useMutation(
    () => projectsAPI.acceptInvite(token),
    {
      onSuccess: (data) => {
        toast.success('Вы присоединились к проекту!')
        // Navigate to the project page
        setTimeout(() => {
          navigate(`/projects/${data.project_id}`)
        }, 1500)
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось принять приглашение')
      },
    }
  )

  const handleAcceptInvite = () => {
    if (!user) {
      toast.error('Войдите, чтобы принять приглашение')
      navigate('/login', { state: { from: `/invite/${token}` } })
      return
    }
    acceptInviteMutation.mutate()
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary-600"></div>
            <span className="text-sm text-gray-500 font-medium">Загрузка приглашения...</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !inviteInfo) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Недействительная ссылка
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Эта ссылка-приглашение недействительна или была удалена.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary btn-md"
            >
              На главную
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!inviteInfo.is_valid) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {inviteInfo.is_expired ? 'Приглашение истекло' : 'Приглашение недействительно'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {inviteInfo.is_expired 
                ? 'Срок действия ссылки истёк. Попросите владельца проекта создать новую.'
                : 'Эта ссылка больше не действительна.'}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary btn-md"
            >
              На главную
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12 px-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="text-center p-6 border-b border-gray-100">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              Вас пригласили!
            </h1>
            <p className="text-sm text-gray-500">
              Присоединяйтесь к работе над проектом
            </p>
          </div>

          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Название проекта</span>
                <p className="text-base font-semibold text-gray-900 mt-0.5">{inviteInfo.project_name}</p>
              </div>
              
              {inviteInfo.project_description && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Описание</span>
                  <p className="text-sm text-gray-700 mt-0.5">{inviteInfo.project_description}</p>
                </div>
              )}
              
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Приглашает</span>
                <p className="text-sm text-gray-700 mt-0.5">{inviteInfo.owner_username}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {!user ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-500 mb-4">
                  Войдите, чтобы принять приглашение
                </p>
                <button
                  onClick={() => navigate('/login', { state: { from: `/invite/${token}` } })}
                  className="btn btn-primary btn-md w-full"
                >
                  Войти и принять
                </button>
                <button
                  onClick={() => navigate('/register', { state: { from: `/invite/${token}` } })}
                  className="btn btn-secondary btn-md w-full"
                >
                  Создать аккаунт
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleAcceptInvite}
                  disabled={acceptInviteMutation.isLoading}
                  className="btn btn-primary btn-md w-full"
                >
                  {acceptInviteMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Присоединение...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Принять приглашение
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-secondary btn-md w-full"
                >
                  Отклонить
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InvitePage

