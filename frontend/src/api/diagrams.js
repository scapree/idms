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

  // Diagram Links
  getDiagramLinks: async (diagramId) => {
    const response = await apiClient.get(`/diagrams/${diagramId}/links`)
    return response.data
  },

  createDiagramLink: async (diagramId, linkData) => {
    const response = await apiClient.post(`/diagrams/${diagramId}/links`, linkData)
    return response.data
  },

  deleteDiagramLink: async (linkId) => {
    const response = await apiClient.delete(`/links/${linkId}`)
    return response.data
  },

  updateDiagramLink: async (linkId, linkData) => {
    const response = await apiClient.patch(`/links/${linkId}`, linkData)
    return response.data
  },

  getElementLinks: async (diagramId, elementId) => {
    const response = await apiClient.get(`/diagrams/${diagramId}/elements/${elementId}/links`)
    return response.data
  },

  getDiagramsForLinking: async () => {
    const response = await apiClient.get('/diagrams-for-linking')
    return response.data
  },

  // Project links for DiagramMap
  getProjectLinks: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/links`)
    return response.data
  },
}






