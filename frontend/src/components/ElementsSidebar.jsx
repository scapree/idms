import React from 'react';

const ELEMENTS = {
  BPMN: [
    { name: 'Start Event', icon: '○', description: 'Тонкий круг - начало процесса' },
    { name: 'Task', icon: '▭', description: 'Прямоугольник с закругленными углами' },
    { name: 'Gateway', icon: '◇', description: 'Ромб - точка принятия решения' },
    { name: 'End Event', icon: '◉', description: 'Толстый круг - завершение процесса' }
  ],
  ERD: [
    { name: 'Entity', icon: '▭', description: 'Прямоугольник - сущность БД' },
    { name: 'Attribute', icon: '◯', description: 'Эллипс - атрибут сущности' },
    { name: 'Relationship', icon: '◇', description: 'Ромб - связь между сущностями' }
  ],
  DFD: [
    { name: 'Process', icon: '◯', description: 'Круг - процесс обработки данных' },
    { name: 'Data Store', icon: '≡', description: 'Параллельные линии - хранилище' },
    { name: 'External Entity', icon: '▭', description: 'Прямоугольник - внешняя сущность' },
    { name: 'Data Flow', icon: '→', description: 'Стрелка показывает поток данных' }
  ]
};

function ElementsSidebar() {
  const onDragStart = (e, data) => {
    const jsonData = JSON.stringify(data);
    e.dataTransfer.setData('application/json', jsonData);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="elements-sidebar">
      <h2 className="panel-title">Элементы диаграмм</h2>
      {Object.entries(ELEMENTS).map(([group, items]) => (
        <div key={group} className="element-group">
          <div className="group-title">{group}</div>
          <div className="group-description">
            {group === 'BPMN' && 'Business Process Model and Notation 2.0'}
            {group === 'ERD' && 'Entity Relationship Diagram (Chen)'}
            {group === 'DFD' && 'Data Flow Diagram (Yourdon)'}
          </div>
          {items.map(item => (
            <div
              key={item.name}
              className="element-item"
              draggable
              onDragStart={e => onDragStart(e, { group, text: item.name })}
              title={item.description}
            >
              <span className="element-icon">{item.icon}</span>
              <span className="element-name">{item.name}</span>
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

export default ElementsSidebar;