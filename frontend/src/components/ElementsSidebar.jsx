import React from 'react';

const ELEMENTS = {
  BPMN: ['Start Event', 'Task', 'Gateway', 'End Event'],
  ERD: ['Entity', 'Attribute', 'Relationship'],
  DFD: ['Process', 'Data Store', 'External Entity', 'Data Flow'],
};

function ElementsSidebar() {
  const onDragStart = (e, data) => {
    // Сериализуем данные для передачи
    const jsonData = JSON.stringify(data);
    e.dataTransfer.setData('application/json', jsonData);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="elements-sidebar">
      <h2 className="panel-title">Элементы</h2>
      {Object.entries(ELEMENTS).map(([group, items]) => (
        <div key={group} className="element-group">
          <div className="group-title">{group}</div>
          {items.map(item => (
            <div
              key={item}
              className="element-item"
              draggable
              onDragStart={e => onDragStart(e, { group, text: item })}
            >
              {item}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

export default ElementsSidebar;