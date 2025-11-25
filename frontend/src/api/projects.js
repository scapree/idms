import apiClient from './client'

export const projectsAPI = {
  getProjects: async () => {
    const response = await apiClient.get('/projects/')
    return response.data
  },

  getProject: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`)
    return response.data
  },

  createProject: async (projectData) => {
    const response = await apiClient.post('/projects/', projectData)
    return response.data
  },

  updateProject: async (projectId, projectData) => {
    const response = await apiClient.put(`/projects/${projectId}`, projectData)
    return response.data
  },

  deleteProject: async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}`)
    return response.data
  },

  // Invite methods
  createInvite: async (projectId, expiresInHours = 24) => {
    const response = await apiClient.post(`/projects/${projectId}/invite`, {
      expires_in_hours: expiresInHours
    })
    return response.data
  },

  getInvites: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/invites`)
    return response.data
  },

  getInviteInfo: async (token) => {
    const response = await apiClient.get(`/invite/${token}`)
    return response.data
  },

  acceptInvite: async (token) => {
    const response = await apiClient.post(`/invite/${token}/accept`)
    return response.data
  },

  deleteInvite: async (projectId, inviteId) => {
    const response = await apiClient.delete(`/projects/${projectId}/invites/${inviteId}`)
    return response.data
  },
}




