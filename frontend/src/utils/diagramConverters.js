/**
 * Diagram format converters
 * Supports: BPMN 2.0 XML, SQL DDL, JSON Schema
 */

// ==========================================
// BPMN 2.0 XML CONVERTER
// ==========================================

const BPMN_NAMESPACE = 'http://www.omg.org/spec/BPMN/20100524/MODEL'
const BPMNDI_NAMESPACE = 'http://www.omg.org/spec/BPMN/20100524/DI'
const DC_NAMESPACE = 'http://www.omg.org/spec/DD/20100524/DC'
const DI_NAMESPACE = 'http://www.omg.org/spec/DD/20100524/DI'

// Map internal shape types to BPMN elements
const BPMN_ELEMENT_MAP = {
  // Events
  'circle': (node) => {
    const label = (node.data?.label || '').toLowerCase()
    if (label.includes('начал') || label.includes('start')) return 'startEvent'
    if (label.includes('конец') || label.includes('end')) return 'endEvent'
    if (label.includes('промеж') || label.includes('intermediate')) return 'intermediateThrowEvent'
    return 'startEvent'
  },
  // Tasks
  'rectangle': (node) => {
    const icon = node.data?.icon || ''
    if (icon === 'User') return 'userTask'
    if (icon === 'Cog') return 'serviceTask'
    if (icon === 'FileCode') return 'scriptTask'
    if (icon === 'Hand') return 'manualTask'
    if (icon === 'Send') return 'sendTask'
    if (icon === 'Download') return 'receiveTask'
    return 'task'
  },
  // Gateways
  'diamond': (node) => {
    const icon = node.data?.icon || ''
    if (icon === 'Plus') return 'parallelGateway'
    if (icon === 'Circle') return 'inclusiveGateway'
    if (icon === 'Sparkles') return 'complexGateway'
    return 'exclusiveGateway'
  },
  // Data
  'data-object': () => 'dataObjectReference',
  'cylinder': () => 'dataStoreReference',
  // Swimlanes
  'lane': (node) => {
    if (node.data?.containerShape === 'pool') return 'participant'
    return 'lane'
  },
}

/**
 * Convert diagram data to BPMN 2.0 XML
 */
export function diagramToBPMN(diagram) {
  const { nodes = [], edges = [] } = diagram.data || {}
  const diagramName = diagram.name || 'Process'
  const processId = `Process_${Date.now()}`
  
  // Create XML document
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:bpmn="${BPMN_NAMESPACE}"
  xmlns:bpmndi="${BPMNDI_NAMESPACE}"
  xmlns:dc="${DC_NAMESPACE}"
  xmlns:di="${DI_NAMESPACE}"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="IDMS"
  exporterVersion="1.0">
  
  <bpmn:process id="${processId}" name="${escapeXml(diagramName)}" isExecutable="false">
`
  
  // Add elements
  nodes.forEach(node => {
    const shape = node.data?.shape || 'rectangle'
    const elementType = typeof BPMN_ELEMENT_MAP[shape] === 'function' 
      ? BPMN_ELEMENT_MAP[shape](node) 
      : BPMN_ELEMENT_MAP[shape] || 'task'
    
    const label = node.data?.label || node.id
    
    xml += `    <bpmn:${elementType} id="${escapeXml(node.id)}" name="${escapeXml(label)}">\n`
    
    // Add incoming/outgoing flows
    const incoming = edges.filter(e => e.target === node.id)
    const outgoing = edges.filter(e => e.source === node.id)
    
    incoming.forEach(e => {
      xml += `      <bpmn:incoming>${escapeXml(e.id)}</bpmn:incoming>\n`
    })
    outgoing.forEach(e => {
      xml += `      <bpmn:outgoing>${escapeXml(e.id)}</bpmn:outgoing>\n`
    })
    
    xml += `    </bpmn:${elementType}>\n`
  })
  
  // Add sequence flows
  edges.forEach(edge => {
    const label = edge.label || ''
    xml += `    <bpmn:sequenceFlow id="${escapeXml(edge.id)}" `
    xml += `sourceRef="${escapeXml(edge.source)}" `
    xml += `targetRef="${escapeXml(edge.target)}"`
    if (label) {
      xml += ` name="${escapeXml(label)}"`
    }
    xml += ` />\n`
  })
  
  xml += `  </bpmn:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
`
  
  // Add diagram shapes
  nodes.forEach(node => {
    const x = node.position?.x || 0
    const y = node.position?.y || 0
    const width = node.data?.width || 100
    const height = node.data?.height || 80
    
    xml += `      <bpmndi:BPMNShape id="${escapeXml(node.id)}_di" bpmnElement="${escapeXml(node.id)}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
      </bpmndi:BPMNShape>
`
  })
  
  // Add diagram edges
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    if (sourceNode && targetNode) {
      const sx = (sourceNode.position?.x || 0) + (sourceNode.data?.width || 100) / 2
      const sy = (sourceNode.position?.y || 0) + (sourceNode.data?.height || 80) / 2
      const tx = (targetNode.position?.x || 0) + (targetNode.data?.width || 100) / 2
      const ty = (targetNode.position?.y || 0) + (targetNode.data?.height || 80) / 2
      
      xml += `      <bpmndi:BPMNEdge id="${escapeXml(edge.id)}_di" bpmnElement="${escapeXml(edge.id)}">
        <di:waypoint x="${sx}" y="${sy}" />
        <di:waypoint x="${tx}" y="${ty}" />
      </bpmndi:BPMNEdge>
`
    }
  })
  
  xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
  
  return xml
}

/**
 * Parse BPMN 2.0 XML to diagram data
 */
export function bpmnToDiagram(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  
  // Check for parsing errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid BPMN XML: ' + parseError.textContent)
  }
  
  const nodes = []
  const edges = []
  
  // Find process element
  const process = doc.querySelector('process')
  if (!process) {
    throw new Error('No process element found in BPMN')
  }
  
  // Get diagram info for positions
  const shapes = {}
  doc.querySelectorAll('BPMNShape').forEach(shape => {
    const bpmnElement = shape.getAttribute('bpmnElement')
    const bounds = shape.querySelector('Bounds')
    if (bounds && bpmnElement) {
      shapes[bpmnElement] = {
        x: parseFloat(bounds.getAttribute('x')) || 0,
        y: parseFloat(bounds.getAttribute('y')) || 0,
        width: parseFloat(bounds.getAttribute('width')) || 100,
        height: parseFloat(bounds.getAttribute('height')) || 80,
      }
    }
  })
  
  // Map BPMN elements to internal shapes with correct sizes
  const REVERSE_ELEMENT_MAP = {
    // Events - 40x40 circles with inner circle
    startEvent: { shape: 'circle', borderColor: '#10b981', width: 40, height: 40, showLabelInside: false, labelPosition: 'bottom', hasInnerCircle: true },
    endEvent: { shape: 'circle', borderColor: '#ef4444', borderWidth: 4, width: 40, height: 40, showLabelInside: false, labelPosition: 'bottom', hasInnerCircle: true },
    intermediateThrowEvent: { shape: 'circle', borderColor: '#6366f1', width: 40, height: 40, showLabelInside: false, labelPosition: 'bottom', hasInnerCircle: true },
    intermediateCatchEvent: { shape: 'circle', borderColor: '#6366f1', width: 40, height: 40, showLabelInside: false, labelPosition: 'bottom', hasInnerCircle: true },
    // Tasks - 100x80 rectangles
    task: { shape: 'rectangle', borderColor: '#2563eb', width: 100, height: 80, borderRadius: 8 },
    userTask: { shape: 'rectangle', borderColor: '#0ea5e9', icon: 'User', width: 100, height: 80, borderRadius: 8 },
    serviceTask: { shape: 'rectangle', borderColor: '#7c3aed', icon: 'Cog', width: 100, height: 80, borderRadius: 8 },
    scriptTask: { shape: 'rectangle', borderColor: '#f59e0b', icon: 'FileCode', width: 100, height: 80, borderRadius: 8 },
    manualTask: { shape: 'rectangle', borderColor: '#f97316', icon: 'Hand', width: 100, height: 80, borderRadius: 8 },
    sendTask: { shape: 'rectangle', borderColor: '#6366f1', icon: 'Send', width: 100, height: 80, borderRadius: 8 },
    receiveTask: { shape: 'rectangle', borderColor: '#22c55e', icon: 'Download', width: 100, height: 80, borderRadius: 8 },
    // Gateways - 50x50 diamonds
    exclusiveGateway: { shape: 'diamond', borderColor: '#f97316', icon: 'X', width: 50, height: 50, showLabelInside: false, labelPosition: 'bottom' },
    parallelGateway: { shape: 'diamond', borderColor: '#22c55e', icon: 'Plus', width: 50, height: 50, showLabelInside: false, labelPosition: 'bottom' },
    inclusiveGateway: { shape: 'diamond', borderColor: '#6366f1', icon: 'Circle', width: 50, height: 50, showLabelInside: false, labelPosition: 'bottom' },
    complexGateway: { shape: 'diamond', borderColor: '#8b5cf6', icon: 'Sparkles', width: 50, height: 50, showLabelInside: false, labelPosition: 'bottom' },
    // Data objects
    dataObjectReference: { shape: 'data-object', borderColor: '#38bdf8', width: 100, height: 80 },
    dataStoreReference: { shape: 'cylinder', borderColor: '#14b8a6', width: 100, height: 80 },
  }
  
  // Parse elements
  const elementTypes = Object.keys(REVERSE_ELEMENT_MAP)
  elementTypes.forEach(elementType => {
    process.querySelectorAll(elementType).forEach(element => {
      const id = element.getAttribute('id')
      const name = element.getAttribute('name') || id
      const config = REVERSE_ELEMENT_MAP[elementType]
      const position = shapes[id] || { x: Math.random() * 500, y: Math.random() * 300 }
      
      nodes.push({
        id,
        type: 'shape',
        position: { x: position.x, y: position.y },
        data: {
          label: name,
          shape: config.shape,
          width: config.width,
          height: config.height,
          background: '#ffffff',
          borderColor: config.borderColor,
          borderWidth: config.borderWidth || 2,
          borderRadius: config.borderRadius,
          textColor: '#111827',
          icon: config.icon,
          iconColor: config.borderColor,
          showLabelInside: config.showLabelInside,
          labelPosition: config.labelPosition,
          hasInnerCircle: config.hasInnerCircle,
          handles: { incoming: ['top', 'right', 'bottom', 'left'], outgoing: ['top', 'right', 'bottom', 'left'] },
        },
      })
    })
  })
  
  // Helper function to determine best handle based on relative positions
  const getBestHandles = (sourceNode, targetNode) => {
    if (!sourceNode || !targetNode) {
      return { sourceHandle: 'source-right', targetHandle: 'target-left' }
    }
    
    const sx = sourceNode.position.x + (sourceNode.data?.width || 50) / 2
    const sy = sourceNode.position.y + (sourceNode.data?.height || 50) / 2
    const tx = targetNode.position.x + (targetNode.data?.width || 50) / 2
    const ty = targetNode.position.y + (targetNode.data?.height || 50) / 2
    
    const dx = tx - sx
    const dy = ty - sy
    
    // Determine direction based on angle
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    let sourceHandle, targetHandle
    
    if (angle >= -45 && angle < 45) {
      // Target is to the right
      sourceHandle = 'source-right'
      targetHandle = 'target-left'
    } else if (angle >= 45 && angle < 135) {
      // Target is below
      sourceHandle = 'source-bottom'
      targetHandle = 'target-top'
    } else if (angle >= -135 && angle < -45) {
      // Target is above
      sourceHandle = 'source-top'
      targetHandle = 'target-bottom'
    } else {
      // Target is to the left
      sourceHandle = 'source-left'
      targetHandle = 'target-right'
    }
    
    return { sourceHandle, targetHandle }
  }
  
  // Parse sequence flows
  process.querySelectorAll('sequenceFlow').forEach(flow => {
    const id = flow.getAttribute('id')
    const sourceRef = flow.getAttribute('sourceRef')
    const targetRef = flow.getAttribute('targetRef')
    const name = flow.getAttribute('name') || ''
    
    if (sourceRef && targetRef) {
      // Find source and target nodes to determine best handles
      const sourceNode = nodes.find(n => n.id === sourceRef)
      const targetNode = nodes.find(n => n.id === targetRef)
      const { sourceHandle, targetHandle } = getBestHandles(sourceNode, targetNode)
      
      edges.push({
        id,
        source: sourceRef,
        target: targetRef,
        sourceHandle,
        targetHandle,
        label: name,
        type: 'default',
        style: { stroke: '#1f2937', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' },
      })
    }
  })
  
  return {
    name: process.getAttribute('name') || 'Imported Process',
    diagram_type: 'bpmn',
    data: { nodes, edges },
  }
}


// ==========================================
// SQL DDL CONVERTER (for ERD)
// ==========================================

const SQL_TYPE_MAP = {
  'int': 'INTEGER',
  'integer': 'INTEGER',
  'string': 'VARCHAR(255)',
  'varchar': 'VARCHAR(255)',
  'text': 'TEXT',
  'boolean': 'BOOLEAN',
  'bool': 'BOOLEAN',
  'date': 'DATE',
  'datetime': 'TIMESTAMP',
  'timestamp': 'TIMESTAMP',
  'float': 'FLOAT',
  'double': 'DOUBLE PRECISION',
  'decimal': 'DECIMAL(10,2)',
  'uuid': 'UUID',
  'json': 'JSON',
  'jsonb': 'JSONB',
}

/**
 * Convert ERD diagram to SQL DDL
 */
export function diagramToSQL(diagram, options = {}) {
  const { nodes = [], edges = [] } = diagram.data || {}
  const { dialect = 'postgresql' } = options
  
  // Filter only entity nodes
  const entities = nodes.filter(n => n.data?.shape === 'entity')
  
  if (entities.length === 0) {
    throw new Error('No entities found in diagram')
  }
  
  let sql = `-- Generated by IDMS
-- Diagram: ${diagram.name || 'ERD'}
-- Date: ${new Date().toISOString()}
-- Dialect: ${dialect.toUpperCase()}

`
  
  // Build relationship map for foreign keys
  const relationships = {}
  edges.forEach(edge => {
    const sourceEntity = entities.find(e => e.id === edge.source)
    const targetEntity = entities.find(e => e.id === edge.target)
    
    if (sourceEntity && targetEntity) {
      const cardinality = edge.data?.cardinality || '1:N'
      if (!relationships[edge.target]) {
        relationships[edge.target] = []
      }
      relationships[edge.target].push({
        sourceTable: sanitizeTableName(sourceEntity.data?.label || sourceEntity.id),
        targetTable: sanitizeTableName(targetEntity.data?.label || targetEntity.id),
        cardinality,
      })
    }
  })
  
  // Generate CREATE TABLE statements
  entities.forEach(entity => {
    const tableName = sanitizeTableName(entity.data?.label || entity.id)
    const attributes = entity.data?.attributes || []
    
    sql += `-- Table: ${tableName}\n`
    sql += `CREATE TABLE ${tableName} (\n`
    
    const columns = []
    const constraints = []
    
    // Add attributes as columns
    attributes.forEach(attr => {
      const colName = sanitizeColumnName(attr.name)
      let colType = inferSQLType(attr.name, attr.type)
      let colDef = `  ${colName} ${colType}`
      
      if (attr.primary) {
        if (dialect === 'postgresql') {
          colDef = `  ${colName} SERIAL PRIMARY KEY`
        } else if (dialect === 'mysql') {
          colDef = `  ${colName} INT AUTO_INCREMENT PRIMARY KEY`
        } else {
          colDef = `  ${colName} INTEGER PRIMARY KEY AUTOINCREMENT`
        }
      } else {
        // Check if this is a foreign key
        if (colName.endsWith('_id')) {
          colDef += ' NOT NULL'
        }
      }
      
      columns.push(colDef)
    })
    
    // If no attributes, add default id
    if (columns.length === 0) {
      if (dialect === 'postgresql') {
        columns.push('  id SERIAL PRIMARY KEY')
      } else if (dialect === 'mysql') {
        columns.push('  id INT AUTO_INCREMENT PRIMARY KEY')
      } else {
        columns.push('  id INTEGER PRIMARY KEY AUTOINCREMENT')
      }
    }
    
    // Add foreign key constraints
    const entityRelations = relationships[entity.id] || []
    entityRelations.forEach(rel => {
      const fkColumn = `${rel.sourceTable.toLowerCase()}_id`
      // Check if FK column exists, if not add it
      if (!columns.some(c => c.includes(fkColumn))) {
        columns.push(`  ${fkColumn} INTEGER NOT NULL`)
      }
      constraints.push(`  FOREIGN KEY (${fkColumn}) REFERENCES ${rel.sourceTable}(id)`)
    })
    
    sql += columns.join(',\n')
    if (constraints.length > 0) {
      sql += ',\n' + constraints.join(',\n')
    }
    sql += '\n);\n\n'
  })
  
  // Add indexes for foreign keys
  sql += '-- Indexes\n'
  Object.values(relationships).flat().forEach(rel => {
    const fkColumn = `${rel.sourceTable.toLowerCase()}_id`
    sql += `CREATE INDEX idx_${rel.targetTable}_${fkColumn} ON ${rel.targetTable}(${fkColumn});\n`
  })
  
  return sql
}

/**
 * Parse SQL DDL to ERD diagram data
 */
export function sqlToDiagram(sqlString) {
  const nodes = []
  const edges = []
  
  // Simple regex-based parser for CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/gi
  let match
  let index = 0
  
  while ((match = tableRegex.exec(sqlString)) !== null) {
    const tableName = match[1]
    const columnsStr = match[2]
    
    const attributes = []
    const foreignKeys = []
    
    // Parse columns
    const lines = columnsStr.split(',').map(l => l.trim()).filter(l => l)
    
    lines.forEach(line => {
      // Skip constraints
      if (line.toUpperCase().startsWith('CONSTRAINT')) return
      if (line.toUpperCase().startsWith('PRIMARY KEY')) return
      if (line.toUpperCase().startsWith('UNIQUE')) return
      if (line.toUpperCase().startsWith('INDEX')) return
      if (line.toUpperCase().startsWith('KEY')) return
      
      // Parse foreign key
      const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i)
      if (fkMatch) {
        foreignKeys.push({
          column: fkMatch[1].replace(/[`"']/g, '').trim(),
          refTable: fkMatch[2],
          refColumn: fkMatch[3].replace(/[`"']/g, '').trim(),
        })
        return
      }
      
      // Parse column definition
      const colMatch = line.match(/^[`"']?(\w+)[`"']?\s+(\w+)/i)
      if (colMatch) {
        const colName = colMatch[1]
        const isPrimary = line.toUpperCase().includes('PRIMARY KEY') || 
                         line.toUpperCase().includes('SERIAL') ||
                         line.toUpperCase().includes('AUTO_INCREMENT')
        
        attributes.push({
          name: colName,
          primary: isPrimary,
        })
      }
    })
    
    // Create node
    const nodeId = `entity-${tableName}-${index}`
    nodes.push({
      id: nodeId,
      type: 'shape',
      position: { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 250 },
      data: {
        label: tableName,
        shape: 'entity',
        width: 200,
        height: 160,
        background: '#ffffff',
        borderColor: '#2563eb',
        borderWidth: 2,
        textColor: '#0f172a',
        attributes,
        handles: { incoming: ['top', 'right', 'bottom', 'left'], outgoing: ['top', 'right', 'bottom', 'left'] },
      },
      _foreignKeys: foreignKeys,
      _tableName: tableName,
    })
    
    index++
  }
  
  // Create edges from foreign keys
  nodes.forEach(node => {
    const fks = node._foreignKeys || []
    fks.forEach((fk, fkIndex) => {
      const targetNode = nodes.find(n => n._tableName?.toLowerCase() === fk.refTable.toLowerCase())
      if (targetNode) {
        edges.push({
          id: `edge-${node.id}-${targetNode.id}-${fkIndex}`,
          source: targetNode.id,
          target: node.id,
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'erd',
          data: { 
            sourceCardinality: 'one',
            targetCardinality: 'many',
            isIdentifying: true,
          },
          style: { stroke: '#111827', strokeWidth: 2 },
        })
      }
    })
    // Clean up temp properties
    delete node._foreignKeys
    delete node._tableName
  })
  
  return {
    name: 'Imported ERD',
    diagram_type: 'erd',
    data: { nodes, edges },
  }
}


// ==========================================
// JSON SCHEMA CONVERTER
// ==========================================

/**
 * Export diagram to JSON Schema format
 */
export function diagramToJSONSchema(diagram) {
  const { nodes = [], edges = [] } = diagram.data || {}
  const diagramType = diagram.diagram_type
  
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `idms://diagrams/${diagram.name || 'diagram'}`,
    title: diagram.name || 'Diagram',
    description: diagram.description || `Exported ${diagramType?.toUpperCase()} diagram`,
    type: 'object',
    properties: {
      metadata: {
        type: 'object',
        properties: {
          name: { type: 'string', const: diagram.name },
          type: { type: 'string', const: diagramType },
          exportedAt: { type: 'string', format: 'date-time' },
          version: { type: 'string', const: '1.0' },
        },
      },
      elements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            label: { type: 'string' },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
            },
            properties: { type: 'object' },
          },
          required: ['id', 'type'],
        },
      },
      connections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            source: { type: 'string' },
            target: { type: 'string' },
            type: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['id', 'source', 'target'],
        },
      },
    },
  }
  
  // Create data that conforms to the schema
  const data = {
    metadata: {
      name: diagram.name,
      type: diagramType,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    elements: nodes.map(node => ({
      id: node.id,
      type: node.data?.shape || 'unknown',
      label: node.data?.label || '',
      position: node.position,
      properties: {
        ...node.data,
        // Include ERD attributes if present
        ...(node.data?.attributes && { attributes: node.data.attributes }),
      },
    })),
    connections: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      type: edge.type || 'default',
      label: edge.label || '',
      properties: {
        ...edge.data,
        style: edge.style,
        markerEnd: edge.markerEnd,
        markerStart: edge.markerStart,
      },
    })),
  }
  
  return {
    schema,
    data,
  }
}

/**
 * Import diagram from JSON Schema data
 */
export function jsonSchemaToDiagram(jsonData) {
  // Handle both schema+data format and plain data format
  const data = jsonData.data || jsonData
  const metadata = data.metadata || {}
  
  const nodes = (data.elements || []).map(element => {
    // Use all properties from element.properties, just ensure shape is set
    const nodeData = {
      ...element.properties,
      label: element.properties?.label || element.label || element.id,
      shape: element.properties?.shape || element.type || 'rectangle',
    }
    
    // Ensure handles exist
    if (!nodeData.handles) {
      nodeData.handles = { 
        incoming: ['top', 'right', 'bottom', 'left'], 
        outgoing: ['top', 'right', 'bottom', 'left'] 
      }
    }
    
    return {
      id: element.id,
      type: 'shape',
      position: element.position || { x: 0, y: 0 },
      data: nodeData,
    }
  })
  
  const edges = (data.connections || []).map(conn => {
    // Extract style properties from properties
    const { style, markerEnd, markerStart, ...restProperties } = conn.properties || {}
    
    return {
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle || null,
      targetHandle: conn.targetHandle || null,
      type: conn.type || 'default',
      label: conn.label || '',
      data: restProperties,
      style: style || { stroke: '#1f2937', strokeWidth: 2 },
      markerEnd: markerEnd || { type: 'arrowclosed' },
      ...(markerStart && { markerStart }),
    }
  })
  
  return {
    name: metadata.name || 'Imported Diagram',
    diagram_type: metadata.type || 'bpmn',
    data: { nodes, edges },
  }
}


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeTableName(name) {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase()
}

function sanitizeColumnName(name) {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase()
}

function inferSQLType(name, explicitType) {
  if (explicitType && SQL_TYPE_MAP[explicitType.toLowerCase()]) {
    return SQL_TYPE_MAP[explicitType.toLowerCase()]
  }
  
  const nameLower = name.toLowerCase()
  
  if (nameLower === 'id' || nameLower.endsWith('_id')) return 'INTEGER'
  if (nameLower.includes('email')) return 'VARCHAR(255)'
  if (nameLower.includes('name') || nameLower.includes('title')) return 'VARCHAR(255)'
  if (nameLower.includes('description') || nameLower.includes('content') || nameLower.includes('text')) return 'TEXT'
  if (nameLower.includes('price') || nameLower.includes('amount') || nameLower.includes('total')) return 'DECIMAL(10,2)'
  if (nameLower.includes('count') || nameLower.includes('quantity') || nameLower.includes('number')) return 'INTEGER'
  if (nameLower.includes('date') || nameLower.includes('_at')) return 'TIMESTAMP'
  if (nameLower.includes('is_') || nameLower.includes('has_') || nameLower.includes('active') || nameLower.includes('enabled')) return 'BOOLEAN'
  if (nameLower.includes('uuid')) return 'UUID'
  if (nameLower.includes('json') || nameLower.includes('data') || nameLower.includes('meta')) return 'JSON'
  
  return 'VARCHAR(255)'
}


// ==========================================
// FILE DOWNLOAD HELPERS
// ==========================================

export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}

