import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { projectsAPI } from '../api/projects'
import Layout from '../components/Layout'
import { Plus, Folder, Trash2, Edit, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const DashboardPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery(
    'projects',
    projectsAPI.getProjects
  )

  // Create project mutation
  const createProjectMutation = useMutation(projectsAPI.createProject, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects')
      setShowCreateModal(false)
      reset()
      toast.success('Project created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create project')
    },
  })

  // Update project mutation
  const updateProjectMutation = useMutation(
    ({ projectId, data }) => projectsAPI.updateProject(projectId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects')
        setEditingProject(null)
        reset()
        toast.success('Project updated successfully!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update project')
      },
    }
  )

  // Delete project mutation
  const deleteProjectMutation = useMutation(projectsAPI.deleteProject, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects')
      toast.success('Project deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete project')
    },
  })

  const onSubmit = (data) => {
    if (editingProject) {
      updateProjectMutation.mutate({ projectId: editingProject.id, data })
    } else {
      createProjectMutation.mutate(data)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    reset({
      name: project.name,
      description: project.description || '',
    })
    setShowCreateModal(true)
  }

  const handleDelete = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProjectMutation.mutate(projectId)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingProject(null)
    reset()
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            <span className="text-gray-600 font-medium">Loading projects...</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center flex-shrink-0 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600">Manage your diagram projects</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-auto">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new project.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {projects.map((project) => (
                <div key={project.id} className="card">
                  <div className="card-header">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        {project.name}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(project)}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={deleteProjectMutation.isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-gray-400 hover:text-red-600"
                          disabled={deleteProjectMutation.isLoading}
                        >
                          {deleteProjectMutation.isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="card-content">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="btn btn-primary btn-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="p-5 border w-96 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProject ? 'Edit Project' : 'Create New Project'}
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Project Name
                    </label>
                    <input
                      {...register('name', { required: 'Project name is required' })}
                      type="text"
                      className="mt-1 input"
                      placeholder="Enter project name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description (Optional)
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="mt-1 input"
                      placeholder="Enter project description"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createProjectMutation.isLoading || updateProjectMutation.isLoading}
                      className="btn btn-primary"
                    >
                      {createProjectMutation.isLoading || updateProjectMutation.isLoading
                        ? 'Saving...'
                        : editingProject
                        ? 'Update'
                        : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default DashboardPage

