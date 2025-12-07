import React, { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

const shortcutGroups = [
  {
    title: 'Основные',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Сохранить диаграмму' },
      { keys: ['Ctrl', 'E'], description: 'Экспорт диаграммы' },
      { keys: ['?'], description: 'Показать горячие клавиши' },
      { keys: ['Esc'], description: 'Снять выделение / Закрыть окно' },
    ]
  },
  {
    title: 'Выделение',
    shortcuts: [
      { keys: ['Ctrl', 'A'], description: 'Выделить все элементы' },
      { keys: ['Клик'], description: 'Выделить элемент' },
      { keys: ['Shift', 'Клик'], description: 'Добавить к выделению' },
    ]
  },
  {
    title: 'Редактирование',
    shortcuts: [
      { keys: ['Delete'], description: 'Удалить выделенные элементы' },
      { keys: ['Backspace'], description: 'Удалить выделенные элементы' },
      { keys: ['Ctrl', 'C'], description: 'Копировать выделенные элементы' },
      { keys: ['Ctrl', 'V'], description: 'Вставить элементы' },
      { keys: ['Ctrl', 'D'], description: 'Дублировать выделенные элементы' },
      { keys: ['Ctrl', 'Z'], description: 'Отменить' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Повторить' },
    ]
  },
  {
    title: 'Вид',
    shortcuts: [
      { keys: ['Ctrl', '+'], description: 'Увеличить' },
      { keys: ['Ctrl', '-'], description: 'Уменьшить' },
      { keys: ['Ctrl', '0'], description: 'Показать всё' },
      { keys: ['Колесо мыши'], description: 'Масштабирование' },
      { keys: ['Перетащить холст'], description: 'Перемещение вида' },
    ]
  },
  {
    title: 'Элементы',
    shortcuts: [
      { keys: ['Двойной клик'], description: 'Редактировать название / атрибуты' },
      { keys: ['ПКМ'], description: 'Контекстное меню' },
      { keys: ['Перетащить'], description: 'Переместить элемент' },
    ]
  },
]

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded">
                <Keyboard className="w-5 h-5 text-gray-700" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Горячие клавиши</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto max-h-[calc(85vh-70px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shortcutGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              {keyIdx > 0 && (
                                <span className="text-gray-300 mx-0.5">+</span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer tip */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Нажмите <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600 font-medium">?</kbd> чтобы показать или скрыть эту панель
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default KeyboardShortcutsModal

