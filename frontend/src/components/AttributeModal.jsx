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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
          <h3 className="text-base font-semibold text-gray-900">
            Редактирование {isEntity ? 'сущности' : 'связи'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder={`Введите название ${isEntity ? 'сущности' : 'связи'}`}
            />
          </div>

          {/* Add Attribute */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Добавить атрибут
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="input flex-1"
                placeholder="Название атрибута"
              />
              {isEntity && (
                <label className="flex items-center px-3 py-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={newAttrIsPrimary}
                    onChange={(e) => setNewAttrIsPrimary(e.target.checked)}
                    className="mr-2"
                  />
                  <Key className="h-4 w-4 mr-1 text-amber-600" />
                  <span className="text-sm">PK</span>
                </label>
              )}
              <button
                onClick={handleAddAttribute}
                className="btn btn-primary btn-md flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </button>
            </div>
          </div>

          {/* Attributes List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Атрибуты ({attributes.length})
            </label>
            {attributes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded">
                Нет атрибутов. Добавьте выше.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
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
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                          title={attr.primary ? 'Первичный ключ' : 'Сделать первичным ключом'}
                        >
                          <Key className="h-4 w-4" />
                        </button>
                      )}
                      <span
                        className={`font-medium ${
                          attr.primary ? 'text-amber-700 underline' : 'text-gray-900'
                        }`}
                      >
                        {attr.name}
                      </span>
                      {attr.primary && (
                        <span className="badge badge-warning">PK</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAttribute(index)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
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
        <div className="flex justify-end gap-2 px-5 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary btn-md"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

export default AttributeModal

