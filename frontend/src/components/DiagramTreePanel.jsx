import React from 'react';

// Компонент теперь получает данные и функции через props
function DiagramTreePanel({ diagrams, activeDiagramId, onSelectDiagram, onAddDiagram }) {
  return (
    <aside className="diagram-tree-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="panel-title">Проект</h2>
        <button 
          onClick={onAddDiagram} 
          className="action-button" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
        >
          + Новая
        </button>
      </div>
      <ul className="tree-list">
        {diagrams.map(diagram => (
          <li 
            key={diagram.id} 
            // Динамически применяем класс 'active'
            className={`tree-item ${diagram.id === activeDiagramId ? 'active' : ''}`}
            // Вызываем функцию для выбора диаграммы при клике
            onClick={() => onSelectDiagram(diagram.id)}
          >
            {diagram.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default DiagramTreePanel;