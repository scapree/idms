import React from 'react';

function DiagramTreePanel({ diagrams, activeDiagramId, onSelectDiagram, onAddDiagram }) {
  const getTypeColor = (type) => {
    const colors = {
      'BPMN': '#2a9d8f',
      'DFD': '#f4a261',
      'ERD': '#e76f51'
    };
    return colors[type] || '#264653';
  };

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
            className={`tree-item ${diagram.id === activeDiagramId ? 'active' : ''}`}
            onClick={() => onSelectDiagram(diagram.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span 
                style={{ 
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getTypeColor(diagram.type)
                }}
              />
              <span style={{ flex: 1 }}>{diagram.name}</span>
              <span 
                style={{ 
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: diagram.id === activeDiagramId ? 'rgba(255,255,255,0.2)' : '#f1f3f5',
                  color: diagram.id === activeDiagramId ? 'white' : '#6c757d',
                  fontWeight: 600
                }}
              >
                {diagram.type}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default DiagramTreePanel;