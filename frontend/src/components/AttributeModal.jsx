import React, { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Key, Link2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'

// Стандартные SQL типы данных
const DATA_TYPES = [
  { value: 'INT', label: 'INT', category: 'Числовые' },
  { value: 'BIGINT', label: 'BIGINT', category: 'Числовые' },
  { value: 'SMALLINT', label: 'SMALLINT', category: 'Числовые' },
  { value: 'DECIMAL', label: 'DECIMAL', category: 'Числовые' },
  { value: 'FLOAT', label: 'FLOAT', category: 'Числовые' },
  { value: 'DOUBLE', label: 'DOUBLE', category: 'Числовые' },
  { value: 'BOOLEAN', label: 'BOOLEAN', category: 'Логические' },
  { value: 'VARCHAR', label: 'VARCHAR', category: 'Строковые' },
  { value: 'CHAR', label: 'CHAR', category: 'Строковые' },
  { value: 'TEXT', label: 'TEXT', category: 'Строковые' },
  { value: 'DATE', label: 'DATE', category: 'Дата/время' },
  { value: 'TIME', label: 'TIME', category: 'Дата/время' },
  { value: 'DATETIME', label: 'DATETIME', category: 'Дата/время' },
  { value: 'TIMESTAMP', label: 'TIMESTAMP', category: 'Дата/время' },
  { value: 'BLOB', label: 'BLOB', category: 'Бинарные' },
  { value: 'JSON', label: 'JSON', category: 'Специальные' },
  { value: 'UUID', label: 'UUID', category: 'Специальные' },
]

const DEFAULT_ATTRIBUTE = {
  name: '',
  type: 'VARCHAR',
  size: '',
  primary: false,
  foreignKey: null, // { entityId, entityName, attributeName }
  nullable: true,
  unique: false,
  default: '',
}

const AttributeModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  nodeData, 
  isEntity = true,
  allEntities = [], // Список всех сущностей для выбора FK
}) => {
  const [name, setName] = useState('')
  const [attributes, setAttributes] = useState([])
  const [newAttr, setNewAttr] = useState({ ...DEFAULT_ATTRIBUTE })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)

  // Фильтруем сущности для FK (исключаем текущую)
  const availableEntities = useMemo(() => {
    return allEntities.filter(e => e.id !== nodeData?.id && e.data?.shape === 'entity')
  }, [allEntities, nodeData?.id])

  useEffect(() => {
    if (isOpen && nodeData) {
      setName(nodeData.label || '')
      const attrs = nodeData.attributes || []
      setAttributes(
        attrs.map((attr) => {
          if (typeof attr === 'string') {
            return { ...DEFAULT_ATTRIBUTE, name: attr }
          }
          return { ...DEFAULT_ATTRIBUTE, ...attr }
        })
      )
      setNewAttr({ ...DEFAULT_ATTRIBUTE })
      setShowAdvanced(false)
      setEditingIndex(null)
    }
  }, [isOpen, nodeData])

  const handleAddAttribute = () => {
    if (newAttr.name.trim()) {
      const attrToAdd = {
        ...newAttr,
        name: newAttr.name.trim(),
        // Если PK - автоматически NOT NULL и UNIQUE
        nullable: newAttr.primary ? false : newAttr.nullable,
        unique: newAttr.primary ? true : newAttr.unique,
      }
      setAttributes([...attributes, attrToAdd])
      setNewAttr({ ...DEFAULT_ATTRIBUTE })
      setShowAdvanced(false)
    }
  }

  const handleUpdateAttribute = (index, updates) => {
    setAttributes(attributes.map((attr, i) => {
      if (i === index) {
        const updated = { ...attr, ...updates }
        // Если PK - автоматически NOT NULL и UNIQUE
        if (updated.primary) {
          updated.nullable = false
          updated.unique = true
        }
        return updated
      }
      return attr
    }))
  }

  const handleRemoveAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const handleTogglePrimary = (index) => {
    if (isEntity) {
      handleUpdateAttribute(index, { 
        primary: !attributes[index].primary,
        // Сбрасываем FK если ставим PK
        foreignKey: attributes[index].primary ? attributes[index].foreignKey : null
      })
    }
  }

  const handleSetForeignKey = (index, fkData) => {
    handleUpdateAttribute(index, { 
      foreignKey: fkData,
      // FK не может быть PK (обычно)
      // primary: false
    })
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

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newAttributes = [...attributes]
    const draggedItem = newAttributes[draggedIndex]
    newAttributes.splice(draggedIndex, 1)
    newAttributes.splice(index, 0, draggedItem)
    setAttributes(newAttributes)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const renderTypeWithSize = (attr) => {
    if (attr.size && ['VARCHAR', 'CHAR', 'DECIMAL'].includes(attr.type)) {
      return `${attr.type}(${attr.size})`
    }
    return attr.type
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col">
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

          {/* Add Attribute Section */}
          <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
            <label className="block text-sm font-medium text-gray-700">
              Добавить атрибут
            </label>
            
            {/* Main row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAttr.name}
                onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value })}
                onKeyPress={handleKeyPress}
                className="input flex-1"
                placeholder="Название атрибута"
              />
              
              <select
                value={newAttr.type}
                onChange={(e) => setNewAttr({ ...newAttr, type: e.target.value })}
                className="input w-32"
              >
                {DATA_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>

              {['VARCHAR', 'CHAR', 'DECIMAL'].includes(newAttr.type) && (
                <input
                  type="text"
                  value={newAttr.size}
                  onChange={(e) => setNewAttr({ ...newAttr, size: e.target.value })}
                  className="input w-20"
                  placeholder="Размер"
                />
              )}

              {isEntity && (
                <label className="flex items-center px-3 py-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 bg-white">
                  <input
                    type="checkbox"
                    checked={newAttr.primary}
                    onChange={(e) => setNewAttr({ ...newAttr, primary: e.target.checked })}
                    className="mr-2"
                  />
                  <Key className="h-4 w-4 mr-1 text-amber-600" />
                  <span className="text-sm">PK</span>
                </label>
              )}

              <button
                onClick={handleAddAttribute}
                className="btn btn-primary btn-md flex items-center"
                disabled={!newAttr.name.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </button>
            </div>

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Дополнительные опции
            </button>

            {/* Advanced options */}
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-gray-200 rounded">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newAttr.nullable}
                    onChange={(e) => setNewAttr({ ...newAttr, nullable: e.target.checked })}
                    disabled={newAttr.primary}
                  />
                  <span className={newAttr.primary ? 'text-gray-400' : ''}>NULL допустим</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newAttr.unique}
                    onChange={(e) => setNewAttr({ ...newAttr, unique: e.target.checked })}
                    disabled={newAttr.primary}
                  />
                  <span className={newAttr.primary ? 'text-gray-400' : ''}>UNIQUE</span>
                </label>

                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Значение по умолчанию</label>
                  <input
                    type="text"
                    value={newAttr.default}
                    onChange={(e) => setNewAttr({ ...newAttr, default: e.target.value })}
                    className="input w-full"
                    placeholder="DEFAULT значение"
                  />
                </div>

                {/* FK Selection */}
                {isEntity && availableEntities.length > 0 && !newAttr.primary && (
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      <Link2 className="h-3.5 w-3.5 inline mr-1 text-blue-500" />
                      Foreign Key (ссылка на)
                    </label>
                    <select
                      value={newAttr.foreignKey ? `${newAttr.foreignKey.entityId}::${newAttr.foreignKey.attributeName}` : ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setNewAttr({ ...newAttr, foreignKey: null })
                        } else {
                          const [entityId, attributeName] = e.target.value.split('::')
                          const entity = availableEntities.find(en => en.id === entityId)
                          setNewAttr({
                            ...newAttr,
                            foreignKey: {
                              entityId,
                              entityName: entity?.data?.label || '',
                              attributeName,
                            }
                          })
                        }
                      }}
                      className="input w-full"
                    >
                      <option value="">-- Нет ссылки --</option>
                      {availableEntities.map(entity => {
                        const pkAttrs = (entity.data?.attributes || []).filter(a => a.primary)
                        if (pkAttrs.length === 0) return null
                        return (
                          <optgroup key={entity.id} label={entity.data?.label || 'Сущность'}>
                            {pkAttrs.map(attr => (
                              <option 
                                key={`${entity.id}::${attr.name}`} 
                                value={`${entity.id}::${attr.name}`}
                              >
                                {entity.data?.label}.{attr.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>
                )}
              </div>
            )}
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
              <div className="border border-gray-200 rounded overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[auto_1fr_120px_80px_80px_60px_60px] gap-2 px-3 py-2 bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                  <div className="w-6"></div>
                  <div>Имя</div>
                  <div>Тип</div>
                  <div className="text-center">PK</div>
                  <div className="text-center">FK</div>
                  <div className="text-center">NULL</div>
                  <div></div>
                </div>
                
                {/* Table Body */}
                <div className="max-h-60 overflow-y-auto">
                  {attributes.map((attr, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`grid grid-cols-[auto_1fr_120px_80px_80px_60px_60px] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                        draggedIndex === index ? 'bg-blue-50' : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <div className="cursor-grab text-gray-400 hover:text-gray-600">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      
                      {/* Name */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-medium truncate ${
                          attr.primary ? 'text-amber-700 underline' : 
                          attr.foreignKey ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {attr.name}
                        </span>
                        {attr.unique && !attr.primary && (
                          <span className="text-[10px] text-purple-500 font-bold">UQ</span>
                        )}
                      </div>
                      
                      {/* Type */}
                      <div className="text-sm text-gray-600 font-mono">
                        {renderTypeWithSize(attr)}
                      </div>
                      
                      {/* PK Toggle */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleTogglePrimary(index)}
                          className={`p-1.5 rounded transition-colors ${
                            attr.primary
                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={attr.primary ? 'Primary Key' : 'Сделать Primary Key'}
                        >
                          <Key className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* FK Indicator/Editor */}
                      <div className="flex justify-center">
                        {attr.foreignKey ? (
                          <button
                            onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                            className="p-1.5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                            title={`FK → ${attr.foreignKey.entityName}.${attr.foreignKey.attributeName}`}
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        ) : !attr.primary && availableEntities.length > 0 ? (
                          <button
                            onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                            className="p-1.5 rounded bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
                            title="Добавить Foreign Key"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                      
                      {/* Nullable */}
                      <div className="text-center text-xs">
                        {attr.primary ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="checkbox"
                              checked={attr.nullable}
                              onChange={(e) => handleUpdateAttribute(index, { nullable: e.target.checked })}
                              className="sr-only"
                            />
                            <span className={attr.nullable ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                              {attr.nullable ? 'YES' : 'NO'}
                            </span>
                          </label>
                        )}
                      </div>
                      
                      {/* Delete */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleRemoveAttribute(index)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* FK Editor Row */}
                      {editingIndex === index && !attr.primary && (
                        <div className="col-span-7 py-2 pl-6 border-t border-gray-100 bg-blue-50/50">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">FK →</span>
                            <select
                              value={attr.foreignKey ? `${attr.foreignKey.entityId}::${attr.foreignKey.attributeName}` : ''}
                              onChange={(e) => {
                                if (e.target.value === '') {
                                  handleSetForeignKey(index, null)
                                } else {
                                  const [entityId, attributeName] = e.target.value.split('::')
                                  const entity = availableEntities.find(en => en.id === entityId)
                                  handleSetForeignKey(index, {
                                    entityId,
                                    entityName: entity?.data?.label || '',
                                    attributeName,
                                  })
                                }
                              }}
                              className="input flex-1"
                            >
                              <option value="">-- Убрать FK --</option>
                              {availableEntities.map(entity => {
                                const pkAttrs = (entity.data?.attributes || []).filter(a => a.primary)
                                if (pkAttrs.length === 0) return null
                                return (
                                  <optgroup key={entity.id} label={entity.data?.label || 'Сущность'}>
                                    {pkAttrs.map(pkAttr => (
                                      <option 
                                        key={`${entity.id}::${pkAttr.name}`} 
                                        value={`${entity.id}::${pkAttr.name}`}
                                      >
                                        {entity.data?.label}.{pkAttr.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )
                              })}
                            </select>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="btn btn-secondary btn-sm"
                            >
                              Готово
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
            <div className="flex items-center gap-1">
              <Key className="h-3.5 w-3.5 text-amber-500" />
              <span>Primary Key</span>
            </div>
            <div className="flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5 text-blue-500" />
              <span>Foreign Key</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-500 font-bold">UQ</span>
              <span>Unique</span>
            </div>
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
