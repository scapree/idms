import React, { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

const shortcutGroups = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Save diagram' },
      { keys: ['Ctrl', 'E'], description: 'Export diagram' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Deselect all / Close modal' },
    ]
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['Ctrl', 'A'], description: 'Select all elements' },
      { keys: ['Click'], description: 'Select element' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected elements' },
      { keys: ['Backspace'], description: 'Delete selected elements' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected elements' },
      { keys: ['Ctrl', 'V'], description: 'Paste elements' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selected elements' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    ]
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['Ctrl', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Fit view to content' },
      { keys: ['Mouse wheel'], description: 'Zoom in/out' },
      { keys: ['Drag canvas'], description: 'Pan view' },
    ]
  },
  {
    title: 'Nodes',
    shortcuts: [
      { keys: ['Double-click'], description: 'Edit node label / attributes' },
      { keys: ['Right-click'], description: 'Open context menu' },
      { keys: ['Drag'], description: 'Move node' },
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Keyboard className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-70px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shortcutGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              {keyIdx > 0 && (
                                <span className="text-slate-300 mx-0.5">+</span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-[28px] px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md shadow-sm">
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
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">?</kbd> anytime to toggle this panel
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default KeyboardShortcutsModal

