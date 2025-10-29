import React, { useState } from 'react';

function DiagramTypeModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('BPMN');

  const diagramTypes = [
    { id: 'BPMN', name: 'BPMN', description: 'Business Process Model and Notation' },
    { id: 'DFD', name: 'DFD', description: 'Data Flow Diagram' },
    { id: 'ERD', name: 'ERD', description: 'Entity Relationship Diagram' }
  ];

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Введите название диаграммы');
      return;
    }
    onCreate(name, selectedType);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#264653' }}>
          Создать новую диаграмму
        </h2>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#264653' }}>
            Название диаграммы:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите название..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '1rem',
              fontFamily: 'Manrope, sans-serif'
            }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#264653' }}>
            Тип диаграммы:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {diagramTypes.map(type => (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  padding: '1rem',
                  border: `2px solid ${selectedType === type.id ? '#2a9d8f' : '#dee2e6'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedType === type.id ? '#e8f5f3' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#264653' }}>
                  {type.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.25rem' }}>
                  {type.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#264653',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#2a9d8f',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiagramTypeModal;