import apiClient from './client'

export const diagramsAPI = {
  getDiagrams: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/diagrams/`)
    return response.data
  },

  getDiagram: async (diagramId) => {
    const response = await apiClient.get(`/diagrams/${diagramId}`)
    return response.data
  },

  createDiagram: async (projectId, diagramData) => {
    const response = await apiClient.post(`/projects/${projectId}/diagrams/`, diagramData)
    return response.data
  },

  updateDiagram: async (diagramId, diagramData) => {
    const response = await apiClient.put(`/diagrams/${diagramId}`, diagramData)
    return response.data
  },

  deleteDiagram: async (diagramId) => {
    const response = await apiClient.delete(`/diagrams/${diagramId}`)
    return response.data
  },

  lockDiagram: async (diagramId) => {
    const response = await apiClient.post(`/diagrams/${diagramId}/lock`)
    return response.data
  },

  unlockDiagram: async (diagramId) => {
    const response = await apiClient.delete(`/diagrams/${diagramId}/lock`)
    return response.data
  },

  getDiagramLock: async (diagramId) => {
    const response = await apiClient.get(`/diagrams/${diagramId}/lock`)
    return response.data
  },
}






