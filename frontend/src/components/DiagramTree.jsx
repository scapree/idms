import React from 'react'
import { FileText, Trash2, Edit } from 'lucide-react'
import { useMutation, useQueryClient } from 'react-query'
import { diagramsAPI } from '../api'
import toast from 'react-hot-toast'

const DiagramTree = ({ diagrams, selectedDiagram, onSelectDiagram }) => {
  const queryClient = useQueryClient()

  // Delete diagram mutation
  const deleteDiagramMutation = useMutation(diagramsAPI.deleteDiagram, {
    onSuccess: () => {
      queryClient.invalidateQueries('diagrams')
      toast.success('Диаграмма удалена!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Не удалось удалить диаграмму')
    },
  })

  const handleDelete = (diagramId, e) => {
    e.stopPropagation()
    if (window.confirm('Вы уверены, что хотите удалить эту диаграмму?')) {
      deleteDiagramMutation.mutate(diagramId)
    }
  }

  const getDiagramIcon = (type) => {
    switch (type) {
      case 'bpmn':
        return '🔄'
      case 'erd':
        return '🗃️'
      case 'dfd':
        return '📊'
      default:
        return '📄'
    }
  }

  const getDiagramTypeLabel = (type) => {
    switch (type) {
      case 'bpmn':
        return 'BPMN'
      case 'erd':
        return 'ERD'
      case 'dfd':
        return 'DFD'
      default:
        return type.toUpperCase()
    }
  }

  if (diagrams.length === 0) {
    return (
      <div className="p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Нет диаграмм</p>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-1">
      {diagrams.map((diagram) => (
        <div
          key={diagram.id}
          className={`group flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors ${
            selectedDiagram?.id === diagram.id
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-gray-50 border border-transparent'
          }`}
          onClick={() => onSelectDiagram(diagram)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-base">{getDiagramIcon(diagram.diagram_type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className={`text-sm font-medium truncate ${selectedDiagram?.id === diagram.id ? 'text-primary-700' : 'text-gray-900'}`}>
                  {diagram.name}
                </p>
                <span className="badge badge-secondary text-[10px] font-mono uppercase">
                  {getDiagramTypeLabel(diagram.diagram_type)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(diagram.updated_at || diagram.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleDelete(diagram.id, e)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Удалить диаграмму"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DiagramTree






