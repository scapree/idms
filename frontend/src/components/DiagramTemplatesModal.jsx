import React, { useState, useMemo } from 'react'
import { X, FileText, Layout, Database, Workflow, Users, ShoppingCart, FileCheck, Server, Layers } from 'lucide-react'

// ==========================================
// ELEMENT CONFIGS (matching DiagramPalette.jsx)
// ==========================================

const ALL_SIDES = ['top', 'right', 'bottom', 'left']

// BPMN Event Styles
const EVENT_STYLES = {
  start: { background: '#ecfdf5', borderColor: '#10b981', textColor: '#065f46', borderWidth: 2 },
  end: { background: '#fef2f2', borderColor: '#ef4444', textColor: '#7f1d1d', borderWidth: 4 },
}

// Create BPMN Start Event node
const createStartEvent = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Начало Простое',
    shape: 'circle',
    width: 40,
    height: 40,
    background: EVENT_STYLES.start.background,
    borderColor: EVENT_STYLES.start.borderColor,
    borderWidth: EVENT_STYLES.start.borderWidth,
    textColor: EVENT_STYLES.start.textColor,
    showLabelInside: false,
    labelPosition: 'bottom',
    icon: 'Circle',
    iconColor: EVENT_STYLES.start.borderColor,
    iconSize: 20,
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN End Event node
const createEndEvent = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Конец Простое',
    shape: 'circle',
    width: 40,
    height: 40,
    background: EVENT_STYLES.end.background,
    borderColor: EVENT_STYLES.end.borderColor,
    borderWidth: EVENT_STYLES.end.borderWidth,
    textColor: EVENT_STYLES.end.textColor,
    showLabelInside: false,
    labelPosition: 'bottom',
    icon: 'Circle',
    iconColor: EVENT_STYLES.end.borderColor,
    iconSize: 20,
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN User Task node
const createUserTask = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Пользовательская',
    shape: 'rectangle',
    width: 100,
    height: 80,
    background: '#ffffff',
    borderColor: '#0ea5e9',
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: 8,
    textColor: '#111827',
    icon: 'User',
    iconColor: '#0ea5e9',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN Service Task node
const createServiceTask = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Сервисная',
    shape: 'rectangle',
    width: 100,
    height: 80,
    background: '#ffffff',
    borderColor: '#7c3aed',
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: 8,
    textColor: '#111827',
    icon: 'Cog',
    iconColor: '#7c3aed',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN Task node  
const createTask = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Задача',
    shape: 'rectangle',
    width: 100,
    height: 80,
    background: '#ffffff',
    borderColor: '#2563eb',
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: 8,
    textColor: '#111827',
    icon: 'Square',
    iconColor: '#2563eb',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN Exclusive Gateway (XOR)
const createExclusiveGateway = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'XOR',
    shape: 'diamond',
    width: 50,
    height: 50,
    background: '#ffffff',
    borderColor: '#f97316',
    borderWidth: 2,
    textColor: '#f97316',
    showLabelInside: false,
    labelPosition: 'bottom',
    icon: 'X',
    iconColor: '#f97316',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN Parallel Gateway (AND)
const createParallelGateway = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'AND',
    shape: 'diamond',
    width: 50,
    height: 50,
    background: '#ffffff',
    borderColor: '#22c55e',
    borderWidth: 2,
    textColor: '#22c55e',
    showLabelInside: false,
    labelPosition: 'bottom',
    icon: 'Plus',
    iconColor: '#22c55e',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create ERD Entity node (with attributes support)
const createErdEntity = (id, label, position, attributes = []) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Сущность',
    shape: 'entity',
    width: 200,
    height: 160,
    background: '#ffffff',
    borderColor: '#2563eb',
    borderWidth: 2,
    textColor: '#0f172a',
    attributes: attributes,
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create DFD Process node
const createDfdProcess = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Процесс',
    shape: 'circle',
    width: 100,
    height: 100,
    background: '#f5f3ff',
    borderColor: '#8b5cf6',
    borderWidth: 2,
    textColor: '#4c1d95',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create DFD External Entity node
const createDfdExternalEntity = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Внешняя сущность',
    shape: 'rectangle',
    width: 140,
    height: 80,
    background: '#f1f5f9',
    borderColor: '#475569',
    borderWidth: 2,
    textColor: '#1e293b',
    fontWeight: 700,
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create DFD Data Store node
const createDfdDataStore = (id, label, position) => ({
  id,
  type: 'shape',
  position,
  data: {
    label: label || 'Хранилище',
    shape: 'data-store',
    width: 160,
    height: 60,
    background: 'transparent',
    borderColor: '#8b5cf6',
    borderWidth: 2,
    textColor: '#4c1d95',
    handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
  },
})

// Create BPMN sequence flow edge (left-to-right flow)
const createSequenceFlow = (id, source, target, label, sourceHandle = 'source-right', targetHandle = 'target-left') => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'default',
  label: label || undefined,
  style: { stroke: '#1f2937', strokeWidth: 2 },
  markerEnd: { type: 'arrowclosed' },
})

// Create vertical BPMN flow (top-to-bottom or bottom-to-top)
const createVerticalFlow = (id, source, target, label, direction = 'down') => ({
  id,
  source,
  target,
  sourceHandle: direction === 'down' ? 'source-bottom' : 'source-top',
  targetHandle: direction === 'down' ? 'target-top' : 'target-bottom',
  type: 'default',
  label: label || undefined,
  style: { stroke: '#1f2937', strokeWidth: 2 },
  markerEnd: { type: 'arrowclosed' },
})

// Create ERD relationship edge
const createErdRelation = (id, source, target, cardinality = '1:N', sourceHandle = 'source-right', targetHandle = 'target-left') => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'erd',
  data: { cardinality },
  style: { stroke: '#111827', strokeWidth: 2 },
})

// Create DFD data flow edge
const createDfdDataFlow = (id, source, target, label, sourceHandle = 'source-right', targetHandle = 'target-left') => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'default',
  label: label || undefined,
  style: { stroke: '#8b5cf6', strokeWidth: 2 },
  markerEnd: { type: 'arrowclosed' },
})

// ==========================================
// BPMN TEMPLATES
// ==========================================

const BPMN_TEMPLATES = [
  {
    id: 'bpmn-simple-process',
    name: 'Простой процесс',
    description: 'Начало → Задача → Конец',
    icon: Workflow,
    nodes: [
      createStartEvent('start-1', 'Начало', { x: 100, y: 200 }),
      createUserTask('task-1', 'Обработка заявки', { x: 220, y: 180 }),
      createEndEvent('end-1', 'Конец', { x: 400, y: 200 }),
    ],
    edges: [
      createSequenceFlow('e1', 'start-1', 'task-1'),
      createSequenceFlow('e2', 'task-1', 'end-1'),
    ],
  },
  {
    id: 'bpmn-approval',
    name: 'Процесс согласования',
    description: 'Заявка с ветвлением: одобрение или отклонение',
    icon: FileCheck,
    nodes: [
      createStartEvent('start-1', 'Заявка', { x: 50, y: 200 }),
      createUserTask('task-review', 'Проверка', { x: 160, y: 180 }),
      createExclusiveGateway('gateway-1', 'Решение?', { x: 330, y: 195 }),
      createServiceTask('task-approve', 'Одобрение', { x: 450, y: 80 }),
      createServiceTask('task-reject', 'Отклонение', { x: 450, y: 280 }),
      createEndEvent('end-1', 'Завершено', { x: 620, y: 200 }),
    ],
    edges: [
      createSequenceFlow('e1', 'start-1', 'task-review'),
      createSequenceFlow('e2', 'task-review', 'gateway-1'),
      // Gateway to approve (up-right)
      createSequenceFlow('e3', 'gateway-1', 'task-approve', 'Да', 'source-top', 'target-left'),
      // Gateway to reject (down-right)
      createSequenceFlow('e4', 'gateway-1', 'task-reject', 'Нет', 'source-bottom', 'target-left'),
      // Approve to end (down-right)
      createSequenceFlow('e5', 'task-approve', 'end-1', undefined, 'source-right', 'target-top'),
      // Reject to end (up-right)
      createSequenceFlow('e6', 'task-reject', 'end-1', undefined, 'source-right', 'target-bottom'),
    ],
  },
  {
    id: 'bpmn-parallel',
    name: 'Параллельные задачи',
    description: 'Разделение на параллельные потоки и слияние',
    icon: Layers,
    nodes: [
      createStartEvent('start-1', 'Начало', { x: 50, y: 200 }),
      createParallelGateway('gateway-split', 'Разделение', { x: 160, y: 195 }),
      createUserTask('task-a', 'Задача A', { x: 300, y: 80 }),
      createUserTask('task-b', 'Задача B', { x: 300, y: 280 }),
      createParallelGateway('gateway-join', 'Слияние', { x: 480, y: 195 }),
      createEndEvent('end-1', 'Конец', { x: 600, y: 200 }),
    ],
    edges: [
      createSequenceFlow('e1', 'start-1', 'gateway-split'),
      // Split to task A (up)
      createSequenceFlow('e2', 'gateway-split', 'task-a', undefined, 'source-top', 'target-left'),
      // Split to task B (down)
      createSequenceFlow('e3', 'gateway-split', 'task-b', undefined, 'source-bottom', 'target-left'),
      // Task A to join (down)
      createSequenceFlow('e4', 'task-a', 'gateway-join', undefined, 'source-right', 'target-top'),
      // Task B to join (up)
      createSequenceFlow('e5', 'task-b', 'gateway-join', undefined, 'source-right', 'target-bottom'),
      createSequenceFlow('e6', 'gateway-join', 'end-1'),
    ],
  },
]

// ==========================================
// ERD TEMPLATES
// ==========================================

const ERD_TEMPLATES = [
  {
    id: 'erd-user-posts',
    name: 'Пользователи и посты',
    description: 'Связь 1:N между пользователями и публикациями',
    icon: Users,
    nodes: [
      createErdEntity('user-entity', 'User', { x: 100, y: 150 }, [
        { name: 'id', primary: true },
        { name: 'username', primary: false },
        { name: 'email', primary: false },
        { name: 'created_at', primary: false },
      ]),
      createErdEntity('post-entity', 'Post', { x: 450, y: 150 }, [
        { name: 'id', primary: true },
        { name: 'user_id', primary: false },
        { name: 'title', primary: false },
        { name: 'content', primary: false },
        { name: 'created_at', primary: false },
      ]),
    ],
    edges: [
      createErdRelation('e1', 'user-entity', 'post-entity', '1:N', 'source-right', 'target-left'),
    ],
  },
  {
    id: 'erd-ecommerce',
    name: 'Интернет-магазин',
    description: 'Покупатели, заказы, товары с позициями',
    icon: ShoppingCart,
    nodes: [
      createErdEntity('customer', 'Customer', { x: 50, y: 50 }, [
        { name: 'id', primary: true },
        { name: 'name', primary: false },
        { name: 'email', primary: false },
        { name: 'phone', primary: false },
      ]),
      createErdEntity('order', 'Order', { x: 400, y: 50 }, [
        { name: 'id', primary: true },
        { name: 'customer_id', primary: false },
        { name: 'total', primary: false },
        { name: 'status', primary: false },
        { name: 'created_at', primary: false },
      ]),
      createErdEntity('order-item', 'OrderItem', { x: 400, y: 320 }, [
        { name: 'id', primary: true },
        { name: 'order_id', primary: false },
        { name: 'product_id', primary: false },
        { name: 'quantity', primary: false },
        { name: 'price', primary: false },
      ]),
      createErdEntity('product', 'Product', { x: 700, y: 320 }, [
        { name: 'id', primary: true },
        { name: 'name', primary: false },
        { name: 'description', primary: false },
        { name: 'price', primary: false },
        { name: 'stock', primary: false },
      ]),
    ],
    edges: [
      // Customer -> Order (horizontal)
      createErdRelation('e1', 'customer', 'order', '1:N', 'source-right', 'target-left'),
      // Order -> OrderItem (vertical down)
      createErdRelation('e2', 'order', 'order-item', '1:N', 'source-bottom', 'target-top'),
      // Product -> OrderItem (horizontal)
      createErdRelation('e3', 'product', 'order-item', '1:N', 'source-left', 'target-right'),
    ],
  },
  {
    id: 'erd-blog',
    name: 'Блог-платформа',
    description: 'Авторы, статьи, категории, комментарии',
    icon: FileText,
    nodes: [
      createErdEntity('author', 'Author', { x: 50, y: 150 }, [
        { name: 'id', primary: true },
        { name: 'name', primary: false },
        { name: 'bio', primary: false },
      ]),
      createErdEntity('article', 'Article', { x: 350, y: 50 }, [
        { name: 'id', primary: true },
        { name: 'author_id', primary: false },
        { name: 'category_id', primary: false },
        { name: 'title', primary: false },
        { name: 'content', primary: false },
        { name: 'published_at', primary: false },
      ]),
      createErdEntity('category', 'Category', { x: 650, y: 150 }, [
        { name: 'id', primary: true },
        { name: 'name', primary: false },
        { name: 'slug', primary: false },
      ]),
      createErdEntity('comment', 'Comment', { x: 350, y: 350 }, [
        { name: 'id', primary: true },
        { name: 'article_id', primary: false },
        { name: 'author_name', primary: false },
        { name: 'text', primary: false },
        { name: 'created_at', primary: false },
      ]),
    ],
    edges: [
      // Author -> Article (diagonal, use right-left)
      createErdRelation('e1', 'author', 'article', '1:N', 'source-right', 'target-left'),
      // Category -> Article (left to right)
      createErdRelation('e2', 'category', 'article', '1:N', 'source-left', 'target-right'),
      // Article -> Comment (vertical down)
      createErdRelation('e3', 'article', 'comment', '1:N', 'source-bottom', 'target-top'),
    ],
  },
]

// ==========================================
// DFD TEMPLATES
// ==========================================

const DFD_TEMPLATES = [
  {
    id: 'dfd-simple',
    name: 'Простая система',
    description: 'Пользователь → Процесс → Хранилище',
    icon: Server,
    nodes: [
      createDfdExternalEntity('user', 'Пользователь', { x: 50, y: 140 }),
      createDfdProcess('process', 'Обработка', { x: 280, y: 130 }),
      createDfdDataStore('store', 'База данных', { x: 520, y: 155 }),
    ],
    edges: [
      createDfdDataFlow('e1', 'user', 'process', 'Запрос', 'source-right', 'target-left'),
      createDfdDataFlow('e2', 'process', 'store', 'Запись', 'source-right', 'target-left'),
      createDfdDataFlow('e3', 'store', 'process', 'Данные', 'source-left', 'target-right'),
    ],
  },
  {
    id: 'dfd-auth',
    name: 'Система авторизации',
    description: 'Проверка пользователя и управление сессиями',
    icon: Users,
    nodes: [
      createDfdExternalEntity('user', 'Пользователь', { x: 50, y: 200 }),
      createDfdProcess('auth', 'Авторизация', { x: 280, y: 80 }),
      createDfdProcess('session', 'Сессии', { x: 280, y: 320 }),
      createDfdDataStore('users-store', 'Пользователи', { x: 520, y: 55 }),
      createDfdDataStore('sessions-store', 'Сессии', { x: 520, y: 335 }),
    ],
    edges: [
      // User -> Auth (diagonal up-right)
      createDfdDataFlow('e1', 'user', 'auth', 'Логин/Пароль', 'source-right', 'target-left'),
      // Auth -> Users store (right)
      createDfdDataFlow('e2', 'auth', 'users-store', 'Проверка', 'source-right', 'target-left'),
      // Users store -> Auth (left, return flow - use different handles)
      createDfdDataFlow('e3', 'users-store', 'auth', 'Результат', 'source-left', 'target-right'),
      // Auth -> Session (down)
      createDfdDataFlow('e4', 'auth', 'session', 'Создать', 'source-bottom', 'target-top'),
      // Session -> Sessions store (right)
      createDfdDataFlow('e5', 'session', 'sessions-store', 'Сохранить', 'source-right', 'target-left'),
      // Session -> User (left, return)
      createDfdDataFlow('e6', 'session', 'user', 'Токен', 'source-left', 'target-right'),
    ],
  },
  {
    id: 'dfd-order',
    name: 'Обработка заказов',
    description: 'Приём, обработка и доставка заказов',
    icon: ShoppingCart,
    nodes: [
      createDfdExternalEntity('customer', 'Клиент', { x: 50, y: 100 }),
      createDfdExternalEntity('warehouse', 'Склад', { x: 50, y: 350 }),
      createDfdProcess('order-proc', 'Приём заказа', { x: 280, y: 80 }),
      createDfdProcess('inventory', 'Проверка', { x: 280, y: 300 }),
      createDfdProcess('delivery', 'Доставка', { x: 520, y: 180 }),
      createDfdDataStore('orders-store', 'Заказы', { x: 520, y: 55 }),
      createDfdDataStore('products-store', 'Товары', { x: 520, y: 340 }),
    ],
    edges: [
      // Customer -> Order (right)
      createDfdDataFlow('e1', 'customer', 'order-proc', 'Заказ', 'source-right', 'target-left'),
      // Order -> Orders store (right)
      createDfdDataFlow('e2', 'order-proc', 'orders-store', 'Сохранить', 'source-right', 'target-left'),
      // Order -> Inventory (down)
      createDfdDataFlow('e3', 'order-proc', 'inventory', 'Проверить', 'source-bottom', 'target-top'),
      // Inventory -> Products store (right)
      createDfdDataFlow('e4', 'inventory', 'products-store', 'Запрос', 'source-right', 'target-left'),
      // Products store -> Inventory (return)
      createDfdDataFlow('e5', 'products-store', 'inventory', 'Наличие', 'source-left', 'target-right'),
      // Inventory -> Warehouse (left-down)
      createDfdDataFlow('e6', 'inventory', 'warehouse', 'Резерв', 'source-left', 'target-right'),
      // Inventory -> Delivery (up-right)
      createDfdDataFlow('e7', 'inventory', 'delivery', 'Готово', 'source-top', 'target-bottom'),
      // Delivery -> Customer (up-left)
      createDfdDataFlow('e8', 'delivery', 'customer', 'Доставка', 'source-left', 'target-right'),
    ],
  },
]

// ==========================================
// ALL TEMPLATES
// ==========================================

const ALL_TEMPLATES = {
  bpmn: BPMN_TEMPLATES,
  erd: ERD_TEMPLATES,
  dfd: DFD_TEMPLATES,
}

const DIAGRAM_TYPE_LABELS = {
  bpmn: 'BPMN',
  erd: 'ERD',
  dfd: 'DFD',
}

// ==========================================
// COMPONENT
// ==========================================

const DiagramTemplatesModal = ({ isOpen, onClose, onSelectTemplate, diagramType }) => {
  const [selectedType, setSelectedType] = useState(diagramType || 'bpmn')
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const templates = useMemo(() => ALL_TEMPLATES[selectedType] || [], [selectedType])

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelectTemplate({
        ...selectedTemplate,
        diagramType: selectedType,
      })
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-lg border border-gray-200 w-full max-w-3xl max-h-[85vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded">
                <Layout className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Шаблоны диаграмм</h2>
                <p className="text-sm text-gray-500">Выберите готовый шаблон для быстрого старта</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Type tabs */}
          <div className="px-5 py-3 border-b flex gap-2 flex-shrink-0">
            {Object.entries(DIAGRAM_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type)
                  setSelectedTemplate(null)
                }}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  selectedType === type
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
                <span className="ml-1.5 text-xs text-gray-400">
                  ({ALL_TEMPLATES[type]?.length || 0})
                </span>
              </button>
            ))}
          </div>

          {/* Templates grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Нет шаблонов для этого типа диаграмм</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => {
                  const IconComponent = template.icon || FileText
                  const isSelected = selectedTemplate?.id === template.id
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${isSelected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{template.nodes?.length || 0} элементов</span>
                            <span>{template.edges?.length || 0} связей</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
            <div className="text-sm text-gray-500">
              {selectedTemplate ? (
                <span>Выбрано: <strong>{selectedTemplate.name}</strong></span>
              ) : (
                <span>Выберите шаблон</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="btn btn-secondary btn-md"
              >
                Отмена
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedTemplate}
                className="btn btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Создать диаграмму
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DiagramTemplatesModal
