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
        toast.success('Successfully joined the project!')
        // Navigate to the project page
        setTimeout(() => {
          navigate(`/projects/${data.project_id}`)
        }, 1500)
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to accept invite')
      },
    }
  )

  const handleAcceptInvite = () => {
    if (!user) {
      toast.error('Please log in to accept the invite')
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="text-gray-600 font-medium">Loading invitation...</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !inviteInfo) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-12 px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Invite
            </h1>
            <p className="text-gray-600 mb-6">
              This invite link is invalid or has been removed.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!inviteInfo.is_valid) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-12 px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {inviteInfo.is_expired ? 'Invite Expired' : 'Invite No Longer Active'}
            </h1>
            <p className="text-gray-600 mb-6">
              {inviteInfo.is_expired 
                ? 'This invite link has expired. Please ask the project owner for a new one.'
                : 'This invite link is no longer active.'}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto mt-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <UserPlus className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              You've been invited!
            </h1>
            <p className="text-gray-600">
              Join and collaborate on a project
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Project Name</span>
                <p className="text-lg font-semibold text-gray-900">{inviteInfo.project_name}</p>
              </div>
              
              {inviteInfo.project_description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description</span>
                  <p className="text-gray-700">{inviteInfo.project_description}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium text-gray-500">Invited by</span>
                <p className="text-gray-700">{inviteInfo.owner_username}</p>
              </div>
            </div>
          </div>

          {!user ? (
            <div className="space-y-3">
              <p className="text-center text-gray-600 mb-4">
                You need to be logged in to accept this invitation
              </p>
              <button
                onClick={() => navigate('/login', { state: { from: `/invite/${token}` } })}
                className="btn btn-primary w-full"
              >
                Log In to Accept
              </button>
              <button
                onClick={() => navigate('/register', { state: { from: `/invite/${token}` } })}
                className="btn btn-secondary w-full"
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvite}
                disabled={acceptInviteMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {acceptInviteMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Invitation
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary w-full"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default InvitePage

