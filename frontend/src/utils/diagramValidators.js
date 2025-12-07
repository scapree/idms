/**
 * Diagram Validators
 * Логическая валидация для BPMN, ERD и DFD диаграмм
 */

// Уровни важности
export const SEVERITY = {
  ERROR: 'error',      // Критическая ошибка
  WARNING: 'warning',  // Предупреждение
  INFO: 'info',        // Информация/рекомендация
}

/**
 * Результат валидации
 */
class ValidationResult {
  constructor() {
    this.issues = []
    this.isValid = true
  }

  addIssue(severity, message, elementId = null, elementType = null) {
    this.issues.push({ severity, message, elementId, elementType })
    if (severity === SEVERITY.ERROR) {
      this.isValid = false
    }
  }

  get errors() {
    return this.issues.filter(i => i.severity === SEVERITY.ERROR)
  }

  get warnings() {
    return this.issues.filter(i => i.severity === SEVERITY.WARNING)
  }

  get infos() {
    return this.issues.filter(i => i.severity === SEVERITY.INFO)
  }

  get hasIssues() {
    return this.issues.length > 0
  }
}

// ==========================================
// BPMN VALIDATION
// ==========================================

/**
 * Валидация BPMN диаграммы
 * Правила:
 * 1. Должен быть хотя бы один стартовый элемент
 * 2. Должен быть хотя бы один конечный элемент  
 * 3. Стартовые события не должны иметь входящих связей
 * 4. Конечные события не должны иметь исходящих связей
 * 5. Все элементы (кроме пулов/дорожек) должны быть связаны
 * 6. Шлюзы должны иметь корректное количество связей
 */
export function validateBPMN(nodes, edges) {
  const result = new ValidationResult()
  
  if (!nodes || nodes.length === 0) {
    result.addIssue(SEVERITY.INFO, 'Диаграмма пуста')
    return result
  }

  // Классификация элементов
  const startEvents = []
  const endEvents = []
  const gateways = []
  const activities = []
  const swimlanes = []
  const dataObjects = []

  nodes.forEach(node => {
    const shape = node.data?.shape
    const label = (node.data?.label || '').toLowerCase()
    const id = node.data?.id || node.id

    if (shape === 'lane') {
      swimlanes.push(node)
    } else if (shape === 'circle') {
      // Определяем тип события по метке или id
      if (label.includes('начал') || label.includes('start') || id.includes('start')) {
        startEvents.push(node)
      } else if (label.includes('конец') || label.includes('end') || id.includes('end')) {
        endEvents.push(node)
      } else if (label.includes('промеж') || label.includes('intermediate')) {
        activities.push(node) // Промежуточные события как активности
      } else {
        // По умолчанию считаем стартовым, если нет других индикаторов
        const incoming = edges.filter(e => e.target === node.id)
        const outgoing = edges.filter(e => e.source === node.id)
        if (incoming.length === 0 && outgoing.length > 0) {
          startEvents.push(node)
        } else if (outgoing.length === 0 && incoming.length > 0) {
          endEvents.push(node)
        } else {
          activities.push(node)
        }
      }
    } else if (shape === 'diamond') {
      gateways.push(node)
    } else if (shape === 'data-object' || shape === 'cylinder') {
      dataObjects.push(node)
    } else if (shape === 'rectangle') {
      activities.push(node)
    }
  })

  // Элементы, которые должны быть связаны
  const flowElements = [...startEvents, ...endEvents, ...activities, ...gateways]

  // Правило 1: Должен быть хотя бы один стартовый элемент
  if (startEvents.length === 0 && flowElements.length > 0) {
    result.addIssue(
      SEVERITY.WARNING, 
      'Не найдено стартовое событие. Рекомендуется добавить начальный элемент процесса.'
    )
  }

  // Правило 2: Должен быть хотя бы один конечный элемент
  if (endEvents.length === 0 && flowElements.length > 0) {
    result.addIssue(
      SEVERITY.WARNING, 
      'Не найдено конечное событие. Рекомендуется добавить завершающий элемент процесса.'
    )
  }

  // Правило 3: Стартовые события не должны иметь входящих связей
  startEvents.forEach(event => {
    const incoming = edges.filter(e => e.target === event.id)
    if (incoming.length > 0) {
      result.addIssue(
        SEVERITY.ERROR,
        `Стартовое событие "${event.data?.label}" имеет входящие связи, что недопустимо.`,
        event.id,
        'node'
      )
    }
  })

  // Правило 4: Конечные события не должны иметь исходящих связей
  endEvents.forEach(event => {
    const outgoing = edges.filter(e => e.source === event.id)
    if (outgoing.length > 0) {
      result.addIssue(
        SEVERITY.ERROR,
        `Конечное событие "${event.data?.label}" имеет исходящие связи, что недопустимо.`,
        event.id,
        'node'
      )
    }
  })

  // Правило 5: Проверка связности (изолированные элементы)
  flowElements.forEach(node => {
    const incoming = edges.filter(e => e.target === node.id)
    const outgoing = edges.filter(e => e.source === node.id)
    
    // Стартовые события могут не иметь входящих, конечные - исходящих
    const isStartEvent = startEvents.includes(node)
    const isEndEvent = endEvents.includes(node)
    
    if (incoming.length === 0 && outgoing.length === 0) {
      result.addIssue(
        SEVERITY.WARNING,
        `Элемент "${node.data?.label}" не связан с другими элементами.`,
        node.id,
        'node'
      )
    } else if (!isStartEvent && incoming.length === 0) {
      result.addIssue(
        SEVERITY.WARNING,
        `Элемент "${node.data?.label}" не имеет входящих связей (недостижим).`,
        node.id,
        'node'
      )
    } else if (!isEndEvent && outgoing.length === 0) {
      result.addIssue(
        SEVERITY.WARNING,
        `Элемент "${node.data?.label}" не имеет исходящих связей (тупик).`,
        node.id,
        'node'
      )
    }
  })

  // Правило 6: Валидация шлюзов
  gateways.forEach(gateway => {
    const incoming = edges.filter(e => e.target === gateway.id)
    const outgoing = edges.filter(e => e.source === gateway.id)
    const icon = gateway.data?.icon || ''
    const label = gateway.data?.label || 'Шлюз'

    // XOR шлюз (исключающий) - один вход, несколько выходов или наоборот
    if (icon === 'X') {
      if (incoming.length < 1) {
        result.addIssue(
          SEVERITY.ERROR,
          `Исключающий шлюз (XOR) "${label}" должен иметь хотя бы один вход.`,
          gateway.id,
          'node'
        )
      }
      if (outgoing.length < 1) {
        result.addIssue(
          SEVERITY.ERROR,
          `Исключающий шлюз (XOR) "${label}" должен иметь хотя бы один выход.`,
          gateway.id,
          'node'
        )
      }
    }
    
    // Параллельный шлюз (AND) - должен иметь минимум 2 входа или 2 выхода
    if (icon === 'Plus') {
      const isJoin = incoming.length >= 2 && outgoing.length === 1
      const isSplit = incoming.length === 1 && outgoing.length >= 2
      const isBoth = incoming.length >= 2 && outgoing.length >= 2
      
      if (!isJoin && !isSplit && !isBoth && (incoming.length > 0 || outgoing.length > 0)) {
        result.addIssue(
          SEVERITY.WARNING,
          `Параллельный шлюз (AND) "${label}" обычно имеет несколько входов или выходов для параллельного исполнения.`,
          gateway.id,
          'node'
        )
      }
    }

    // Включающий шлюз (OR)
    if (icon === 'Circle') {
      if (incoming.length === 0 || outgoing.length === 0) {
        result.addIssue(
          SEVERITY.WARNING,
          `Включающий шлюз (OR) "${label}" должен иметь входы и выходы.`,
          gateway.id,
          'node'
        )
      }
    }
  })

  return result
}


// ==========================================
// ERD VALIDATION
// ==========================================

/**
 * Валидация ERD диаграммы
 * Правила:
 * 1. Каждая сущность должна иметь хотя бы один атрибут
 * 2. Каждая сущность должна иметь первичный ключ (PK)
 * 3. Не должно быть дублирующихся имен сущностей
 * 4. Атрибуты внутри сущности должны быть уникальными
 * 5. FK должен ссылаться на существующую сущность
 * 6. Связи должны соединять сущности (не другие элементы)
 */
export function validateERD(nodes, edges) {
  const result = new ValidationResult()
  
  if (!nodes || nodes.length === 0) {
    result.addIssue(SEVERITY.INFO, 'Диаграмма пуста')
    return result
  }

  // Фильтруем только сущности
  const entities = nodes.filter(n => n.data?.shape === 'entity')
  
  if (entities.length === 0) {
    result.addIssue(SEVERITY.INFO, 'Не найдено сущностей в ERD диаграмме')
    return result
  }

  // Правило 3: Проверка уникальности имен сущностей
  const entityNames = new Map()
  entities.forEach(entity => {
    const name = (entity.data?.label || '').toLowerCase().trim()
    if (name) {
      if (entityNames.has(name)) {
        result.addIssue(
          SEVERITY.ERROR,
          `Дублирующееся имя сущности: "${entity.data?.label}". Имена сущностей должны быть уникальными.`,
          entity.id,
          'node'
        )
      } else {
        entityNames.set(name, entity)
      }
    }
  })

  // Валидация каждой сущности
  entities.forEach(entity => {
    const label = entity.data?.label || 'Сущность'
    const attributes = entity.data?.attributes || []

    // Правило 1: Проверка наличия атрибутов
    if (attributes.length === 0) {
      result.addIssue(
        SEVERITY.WARNING,
        `Сущность "${label}" не имеет атрибутов. Рекомендуется добавить поля.`,
        entity.id,
        'node'
      )
    } else {
      // Правило 2: Проверка наличия первичного ключа
      const hasPK = attributes.some(attr => 
        typeof attr === 'object' && attr.primary
      )
      if (!hasPK) {
        result.addIssue(
          SEVERITY.WARNING,
          `Сущность "${label}" не имеет первичного ключа (PK). Рекомендуется добавить.`,
          entity.id,
          'node'
        )
      }

      // Правило 4: Уникальность имен атрибутов внутри сущности
      const attrNames = new Set()
      attributes.forEach((attr, index) => {
        const attrName = (typeof attr === 'object' ? attr.name : attr || '').toLowerCase().trim()
        if (attrName) {
          if (attrNames.has(attrName)) {
            result.addIssue(
              SEVERITY.ERROR,
              `Дублирующийся атрибут "${attrName}" в сущности "${label}".`,
              entity.id,
              'node'
            )
          } else {
            attrNames.add(attrName)
          }
        }
      })

      // Правило 5: Проверка FK ссылок
      attributes.forEach(attr => {
        if (typeof attr === 'object' && attr.foreignKey) {
          const referencedEntityId = attr.foreignKey.entityId
          const referencedEntity = entities.find(e => e.id === referencedEntityId)
          
          if (!referencedEntity) {
            result.addIssue(
              SEVERITY.ERROR,
              `FK "${attr.name}" в сущности "${label}" ссылается на несуществующую сущность.`,
              entity.id,
              'node'
            )
          } else {
            // Проверяем существование атрибута в referenced entity
            const refAttrs = referencedEntity.data?.attributes || []
            const refAttrExists = refAttrs.some(ra => 
              (typeof ra === 'object' ? ra.name : ra) === attr.foreignKey.attributeName
            )
            if (!refAttrExists) {
              result.addIssue(
                SEVERITY.WARNING,
                `FK "${attr.name}" ссылается на атрибут "${attr.foreignKey.attributeName}", который не найден в сущности "${referencedEntity.data?.label}".`,
                entity.id,
                'node'
              )
            }
          }
        }
      })
    }
  })

  // Правило 6: Связи должны соединять сущности
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    if (sourceNode && sourceNode.data?.shape !== 'entity') {
      result.addIssue(
        SEVERITY.ERROR,
        `Связь исходит из элемента "${sourceNode.data?.label}", который не является сущностью.`,
        edge.id,
        'edge'
      )
    }
    
    if (targetNode && targetNode.data?.shape !== 'entity') {
      result.addIssue(
        SEVERITY.ERROR,
        `Связь направлена в элемент "${targetNode.data?.label}", который не является сущностью.`,
        edge.id,
        'edge'
      )
    }
  })

  // Проверка кардинальности M:N - рекомендация создать промежуточную таблицу
  edges.forEach(edge => {
    const sourceCardinality = edge.data?.sourceCardinality
    const targetCardinality = edge.data?.targetCardinality
    
    if (sourceCardinality === 'many' && targetCardinality === 'many') {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      const sourceName = sourceNode?.data?.label || 'Source'
      const targetName = targetNode?.data?.label || 'Target'
      
      result.addIssue(
        SEVERITY.INFO,
        `Связь M:N между "${sourceName}" и "${targetName}". Для реализации в БД потребуется промежуточная таблица.`,
        edge.id,
        'edge'
      )
    }
  })

  return result
}


// ==========================================
// DFD VALIDATION
// ==========================================

/**
 * Валидация DFD диаграммы (Yourdon & DeMarco notation)
 * Правила:
 * 1. Процессы должны иметь хотя бы один вход И один выход
 * 2. Хранилища данных не могут напрямую соединяться между собой
 * 3. Внешние сущности не могут напрямую соединяться между собой
 * 4. Потоки данных должны иметь осмысленные имена
 * 5. Не должно быть изолированных элементов
 */
export function validateDFD(nodes, edges) {
  const result = new ValidationResult()
  
  if (!nodes || nodes.length === 0) {
    result.addIssue(SEVERITY.INFO, 'Диаграмма пуста')
    return result
  }

  // Классификация элементов
  const processes = []
  const dataStores = []
  const externalEntities = []

  nodes.forEach(node => {
    const shape = node.data?.shape
    const id = node.data?.id || node.id

    if (shape === 'circle' || id.includes('process')) {
      processes.push(node)
    } else if (shape === 'data-store' || id.includes('data-store')) {
      dataStores.push(node)
    } else if (shape === 'rectangle' || id.includes('external')) {
      externalEntities.push(node)
    }
  })

  // Правило 1: Процессы должны иметь входы и выходы
  processes.forEach(process => {
    const incoming = edges.filter(e => e.target === process.id)
    const outgoing = edges.filter(e => e.source === process.id)
    const label = process.data?.label || 'Процесс'

    if (incoming.length === 0) {
      result.addIssue(
        SEVERITY.ERROR,
        `Процесс "${label}" не имеет входящих потоков данных. Каждый процесс должен принимать данные.`,
        process.id,
        'node'
      )
    }

    if (outgoing.length === 0) {
      result.addIssue(
        SEVERITY.ERROR,
        `Процесс "${label}" не имеет исходящих потоков данных. Каждый процесс должен производить данные.`,
        process.id,
        'node'
      )
    }
  })

  // Правило 2: Хранилища данных не соединяются напрямую
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    const sourceIsStore = dataStores.some(ds => ds.id === edge.source)
    const targetIsStore = dataStores.some(ds => ds.id === edge.target)
    
    if (sourceIsStore && targetIsStore) {
      result.addIssue(
        SEVERITY.ERROR,
        `Хранилища данных "${sourceNode?.data?.label}" и "${targetNode?.data?.label}" связаны напрямую. Данные должны проходить через процесс.`,
        edge.id,
        'edge'
      )
    }
  })

  // Правило 3: Внешние сущности не соединяются напрямую
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    const sourceIsExternal = externalEntities.some(ee => ee.id === edge.source)
    const targetIsExternal = externalEntities.some(ee => ee.id === edge.target)
    
    if (sourceIsExternal && targetIsExternal) {
      result.addIssue(
        SEVERITY.ERROR,
        `Внешние сущности "${sourceNode?.data?.label}" и "${targetNode?.data?.label}" связаны напрямую. Данные должны проходить через процесс.`,
        edge.id,
        'edge'
      )
    }
  })

  // Правило 4: Потоки данных должны иметь имена
  edges.forEach(edge => {
    const label = edge.label || edge.data?.label || ''
    if (!label || label === 'Data Flow') {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      
      result.addIssue(
        SEVERITY.WARNING,
        `Поток данных между "${sourceNode?.data?.label || 'элемент'}" и "${targetNode?.data?.label || 'элемент'}" не имеет описательного имени.`,
        edge.id,
        'edge'
      )
    }
  })

  // Правило 5: Проверка изолированных элементов
  nodes.forEach(node => {
    const incoming = edges.filter(e => e.target === node.id)
    const outgoing = edges.filter(e => e.source === node.id)
    
    if (incoming.length === 0 && outgoing.length === 0) {
      result.addIssue(
        SEVERITY.WARNING,
        `Элемент "${node.data?.label}" не связан с другими элементами диаграммы.`,
        node.id,
        'node'
      )
    }
  })

  // Правило 6: Хранилища должны иметь хотя бы одну связь с процессом
  dataStores.forEach(store => {
    const connections = edges.filter(e => e.source === store.id || e.target === store.id)
    const hasProcessConnection = connections.some(edge => {
      const otherId = edge.source === store.id ? edge.target : edge.source
      return processes.some(p => p.id === otherId)
    })
    
    if (!hasProcessConnection && connections.length > 0) {
      result.addIssue(
        SEVERITY.WARNING,
        `Хранилище "${store.data?.label}" не связано с процессами.`,
        store.id,
        'node'
      )
    }
  })

  return result
}


// ==========================================
// MAIN VALIDATION FUNCTION
// ==========================================

/**
 * Валидировать диаграмму на основе её типа
 * @param {string} diagramType - Тип диаграммы (bpmn, erd, dfd)
 * @param {Array} nodes - Массив узлов
 * @param {Array} edges - Массив связей
 * @returns {ValidationResult} Результат валидации
 */
export function validateDiagram(diagramType, nodes, edges) {
  switch (diagramType?.toLowerCase()) {
    case 'bpmn':
      return validateBPMN(nodes, edges)
    case 'erd':
      return validateERD(nodes, edges)
    case 'dfd':
      return validateDFD(nodes, edges)
    default:
      const result = new ValidationResult()
      result.addIssue(SEVERITY.INFO, `Валидация для типа "${diagramType}" не реализована`)
      return result
  }
}

export default validateDiagram

