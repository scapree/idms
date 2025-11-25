import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { projectsAPI, diagramsAPI } from '../api'
import Layout from '../components/Layout'
import DiagramEditor from '../components/DiagramEditor'
import DiagramTree from '../components/DiagramTree'
import DiagramPalette from '../components/DiagramPalette'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Plus, FileText, Share2, Copy, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ProjectPage = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDiagram, setSelectedDiagram] = useState(null)
  const [selectedDiagramType, setSelectedDiagramType] = useState('bpmn')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDiagramName, setNewDiagramName] = useState('')
  const [diagramLock, setDiagramLock] = useState(null)
  const [connectionType, setConnectionType] = useState('sequence-flow')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const { user } = useAuth()
  const heldLockRef = useRef(null)

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery(
    ['project', projectId],
    () => projectsAPI.getProject(projectId)
  )

  // Fetch diagrams
  const { data: diagrams = [], isLoading: diagramsLoading } = useQuery(
    ['diagrams', projectId],
    () => diagramsAPI.getDiagrams(projectId)
  )

  // Create diagram mutation
  const createDiagramMutation = useMutation(
    (data) => diagramsAPI.createDiagram(projectId, data),
    {
      onSuccess: (newDiagram) => {
        queryClient.invalidateQueries(['diagrams', projectId])
        setSelectedDiagram(newDiagram)
        setShowCreateModal(false)
        setNewDiagramName('')
        toast.success('Diagram created successfully!')
      },
      onError: (error) => {
        const errorDetail = error.response?.data?.detail
        let errorMessage = 'Failed to create diagram'
        
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail
        } else if (Array.isArray(errorDetail)) {
          // Pydantic v2 validation errors format
          errorMessage = errorDetail.map(err => err.msg || err.message).join(', ')
        } else if (errorDetail && typeof errorDetail === 'object') {
          errorMessage = errorDetail.msg || errorDetail.message || 'Failed to create diagram'
        }
        
        toast.error(errorMessage)
      },
    }
  )

  // Create invite mutation
  const createInviteMutation = useMutation(
    () => projectsAPI.createInvite(projectId, 24),
    {
      onSuccess: (invite) => {
        const link = `${window.location.origin}/invite/${invite.token}`
        setInviteLink(link)
        setShowInviteModal(true)
        toast.success('Invite link created!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to create invite link')
      },
    }
  )


  useEffect(() => {
    if (selectedDiagram?.diagram_type !== 'bpmn') {
      setConnectionType('sequence-flow')
    }
  }, [selectedDiagram?.diagram_type])

  useEffect(() => {
    const diagramId = selectedDiagram?.id
    const userId = user?.id

    if (!diagramId || !userId) {
      setDiagramLock(null)
      return () => {}
    }

    let cancelled = false

    const acquireLock = async () => {
      try {
        const lockData = await diagramsAPI.lockDiagram(diagramId)

        if (cancelled) {
          if (lockData?.user?.id === userId) {
            diagramsAPI.unlockDiagram(diagramId).catch((error) => {
              console.error('Failed to release diagram lock after cancellation', error)
            })
          }
          return
        }

        setDiagramLock(lockData)

        if (lockData?.user?.id === userId) {
          heldLockRef.current = { diagramId, userId }
        } else {
          heldLockRef.current = null
        }
      } catch (error) {
        if (cancelled) return

        heldLockRef.current = null
        console.error('Failed to lock diagram', error)
        
        // Don't show error toast, just set lock to null
        if (!cancelled) {
          setDiagramLock(null)
        }
      }
    }

    acquireLock()

    return () => {
      cancelled = true

      const heldLock = heldLockRef.current
      if (heldLock && heldLock.diagramId === diagramId) {
        heldLockRef.current = null
        setDiagramLock((currentLock) =>
          currentLock?.diagram_id === diagramId ? null : currentLock
        )
        diagramsAPI.unlockDiagram(diagramId).catch((error) => {
          console.error('Failed to release diagram lock', error)
        })
      }
    }
  }, [selectedDiagram?.id, user?.id])

  const handleCreateDiagram = () => {
    if (!newDiagramName.trim()) {
      toast.error('Please enter a diagram name')
      return
    }

    createDiagramMutation.mutate({
      name: newDiagramName,
      diagram_type: selectedDiagramType,
    })
  }

  const handleCreateInvite = () => {
    createInviteMutation.mutate()
  }

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invite link copied to clipboard!')
  }

  const lockedByCurrentUser = Boolean(
    diagramLock && user && diagramLock.user?.id === user.id
  )

  const isDiagramLockedForEditing = Boolean(diagramLock && !lockedByCurrentUser)

  const lockOwnerLabel = diagramLock
    ? lockedByCurrentUser
      ? 'you'
      : diagramLock.user?.username
    : undefined

  if (projectLoading || diagramsLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
          <span className="text-gray-600 font-medium">
            {projectLoading ? 'Loading project...' : 'Loading diagrams...'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {project?.name}
            </h1>
            <p className="text-sm text-gray-500">
              {diagrams.length} diagram{diagrams.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedDiagram && diagramLock && (
            <span
              className={`text-sm ${lockedByCurrentUser ? 'text-gray-500' : 'text-red-600'}`}
            >
              Locked by {lockedByCurrentUser ? 'you' : diagramLock.user?.username}
            </span>
          )}
          <button
            onClick={handleCreateInvite}
            disabled={createInviteMutation.isLoading}
            className="btn btn-secondary btn-sm"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Diagram
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Diagram Tree */}
        <div className="w-80 bg-white border-r flex flex-col flex-shrink-0">
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Diagrams</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DiagramTree
              diagrams={diagrams}
              selectedDiagram={selectedDiagram}
              onSelectDiagram={setSelectedDiagram}
            />
          </div>
        </div>

        {/* Center Panel - Diagram Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDiagram ? (
            <DiagramEditor
              diagram={selectedDiagram}
              diagramType={selectedDiagram.diagram_type}
              isLocked={isDiagramLockedForEditing}
              lockUser={lockOwnerLabel}
              connectionType={connectionType}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No diagram selected
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a diagram from the left panel or create a new one.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Palette */}
        <div className="w-80 bg-white border-l flex-shrink-0 overflow-hidden">
          <DiagramPalette
            diagramType={selectedDiagram?.diagram_type || 'bpmn'}
            selectedConnectionType={connectionType}
            onConnectionTypeChange={setConnectionType}
          />
        </div>
      </div>

      {/* Create Diagram Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-5 border w-96 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Diagram
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Diagram Name
                  </label>
                  <input
                    type="text"
                    value={newDiagramName}
                    onChange={(e) => setNewDiagramName(e.target.value)}
                    className="mt-1 input"
                    placeholder="Enter diagram name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Diagram Type
                  </label>
                  <select
                    value={selectedDiagramType}
                    onChange={(e) => setSelectedDiagramType(e.target.value)}
                    className="mt-1 input"
                  >
                    <option value="bpmn">BPMN</option>
                    <option value="erd">ERD</option>
                    <option value="dfd">DFD</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewDiagramName('')
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDiagram}
                    disabled={createDiagramMutation.isLoading}
                    className="btn btn-primary"
                  >
                    {createDiagramMutation.isLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Share Project
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share this link with others to invite them to collaborate on this project.
                The link will expire in 24 hours.
              </p>
              
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 input bg-gray-50"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="btn btn-primary"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectPage

