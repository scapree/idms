import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Key } from 'lucide-react'

const AttributeModal = ({ isOpen, onClose, onSave, nodeData, isEntity = true }) => {
  const [name, setName] = useState('')
  const [attributes, setAttributes] = useState([])
  const [newAttrName, setNewAttrName] = useState('')
  const [newAttrIsPrimary, setNewAttrIsPrimary] = useState(false)

  useEffect(() => {
    if (isOpen && nodeData) {
      setName(nodeData.label || '')
      const attrs = nodeData.attributes || []
      setAttributes(
        attrs.map((attr) => {
          if (typeof attr === 'string') {
            return { name: attr, primary: false }
          }
          return { ...attr }
        })
      )
      setNewAttrName('')
      setNewAttrIsPrimary(false)
    }
  }, [isOpen, nodeData])

  const handleAddAttribute = () => {
    if (newAttrName.trim()) {
      setAttributes([
        ...attributes,
        { name: newAttrName.trim(), primary: isEntity ? newAttrIsPrimary : false },
      ])
      setNewAttrName('')
      setNewAttrIsPrimary(false)
    }
  }

  const handleRemoveAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index))
  }

  const handleTogglePrimary = (index) => {
    if (isEntity) {
      setAttributes(
        attributes.map((attr, i) =>
          i === index ? { ...attr, primary: !attr.primary } : attr
        )
      )
    }
  }

  const handleSave = () => {
    onSave({
      label: name.trim() || nodeData.label,
      attributes,
    })
    onClose()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddAttribute()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit {isEntity ? 'Entity' : 'Relationship'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Enter ${isEntity ? 'entity' : 'relationship'} name`}
            />
          </div>

          {/* Add Attribute */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Attribute
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Attribute name"
              />
              {isEntity && (
                <label className="flex items-center px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={newAttrIsPrimary}
                    onChange={(e) => setNewAttrIsPrimary(e.target.checked)}
                    className="mr-2"
                  />
                  <Key className="h-4 w-4 mr-1 text-orange-600" />
                  <span className="text-sm">PK</span>
                </label>
              )}
              <button
                onClick={handleAddAttribute}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>

          {/* Attributes List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attributes ({attributes.length})
            </label>
            {attributes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                No attributes yet. Add one above.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {attributes.map((attr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {isEntity && (
                        <button
                          onClick={() => handleTogglePrimary(index)}
                          className={`p-1 rounded ${
                            attr.primary
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                          title={attr.primary ? 'Primary Key' : 'Make Primary Key'}
                        >
                          <Key className="h-4 w-4" />
                        </button>
                      )}
                      <span
                        className={`font-medium ${
                          attr.primary ? 'text-orange-600 underline' : 'text-gray-900'
                        }`}
                      >
                        {attr.name}
                      </span>
                      {attr.primary && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                          PK
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAttribute(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default AttributeModal

