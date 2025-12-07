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
      toast.success('Проект создан!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Не удалось создать проект')
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
        toast.success('Проект обновлён!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось обновить проект')
      },
    }
  )

  // Delete project mutation
  const deleteProjectMutation = useMutation(projectsAPI.deleteProject, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects')
      toast.success('Проект удалён!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Не удалось удалить проект')
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
    if (window.confirm('Вы уверены, что хотите удалить этот проект?')) {
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
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary-600"></div>
            <span className="text-sm text-gray-500 font-medium">Загрузка проектов...</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center flex-shrink-0 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Мои проекты</h1>
            <p className="text-sm text-gray-500 mt-0.5">Управление проектами диаграмм</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Новый проект
          </button>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-auto">
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 text-base font-medium text-gray-900">Нет проектов</h3>
              <p className="mt-1 text-sm text-gray-500">
                Создайте свой первый проект.
              </p>
              <div className="mt-5">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Новый проект
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-6">
              {projects.map((project) => (
                <div key={project.id} className="card hover:border-gray-300 transition-colors">
                  <div className="card-header">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          disabled={deleteProjectMutation.isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="card-content">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="btn btn-primary btn-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Открыть
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-gray-200 w-96 max-h-[90vh] overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingProject ? 'Редактировать проект' : 'Новый проект'}
                </h3>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Название проекта
                  </label>
                  <input
                    {...register('name', { required: 'Введите название проекта' })}
                    type="text"
                    className="input"
                    placeholder="Введите название"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Описание (необязательно)
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="input"
                    placeholder="Введите описание"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-secondary btn-md"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectMutation.isLoading || updateProjectMutation.isLoading}
                    className="btn btn-primary btn-md"
                  >
                    {createProjectMutation.isLoading || updateProjectMutation.isLoading
                      ? 'Сохранение...'
                      : editingProject
                      ? 'Сохранить'
                      : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default DashboardPage

