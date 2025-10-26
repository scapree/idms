import React from 'react';

const ELEMENTS = {
  BPMN: [
    { text: 'Start Event', category: 'event', eventType: 1 },
    { text: 'End Event', category: 'event', eventType: 2 },
    { text: 'Task', category: 'activity', taskType: 1 },
    { text: 'User Task', category: 'activity', taskType: 2 },
    { text: 'Service Task', category: 'activity', taskType: 3 },
    { text: 'Subprocess', category: 'activity', taskType: 6 },
    { text: 'Exclusive Gateway', category: 'gateway', gatewayType: 1 },
    { text: 'Parallel Gateway', category: 'gateway', gatewayType: 2 },
    { text: 'Inclusive Gateway', category: 'gateway', gatewayType: 3 },
    { text: 'Data Object', category: 'dataobject' },
    { text: 'Data Store', category: 'datastore' },
    { text: 'Annotation', category: 'annotation' }
  ],
  DFD: [
    { text: 'Process', category: 'process' },
    { text: 'Data Store', category: 'store' },
    { text: 'External Entity', category: 'external' },
    { text: 'Data Flow', category: 'flow' }
  ],
  ERD: [
    { text: 'Entity', category: 'entity' },
    { text: 'Attribute', category: 'attribute' },
    { text: 'Relationship', category: 'relationship' }
  ]
};

function ElementsSidebar({ activeDiagramType }) {
  const onDragStart = (e, data) => {
    const jsonData = JSON.stringify(data);
    e.dataTransfer.setData('application/json', jsonData);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!activeDiagramType) {
    return (
      <aside className="elements-sidebar">
        <h2 className="panel-title">Элементы</h2>
        <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
          Выберите диаграмму для отображения элементов
        </p>
      </aside>
    );
  }

  const elements = ELEMENTS[activeDiagramType] || [];

  return (
    <aside className="elements-sidebar">
      <h2 className="panel-title">Элементы {activeDiagramType}</h2>
      <div className="element-group">
        <div className="group-title">{activeDiagramType} Элементы</div>
        {elements.map((item, index) => (
          <div
            key={index}
            className="element-item"
            draggable
            onDragStart={e => onDragStart(e, { ...item, diagramType: activeDiagramType })}
          >
            {item.text}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default ElementsSidebar;