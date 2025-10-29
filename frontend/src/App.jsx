// src/App.jsx
import React, { useState, useCallback } from 'react';
import './index.css';
import './App.css';
import TopBar from './components/TopBar';
import DiagramTreePanel from './components/DiagramTreePanel';
import ElementsSidebar from './components/ElementsSidebar';
import DiagramEditor from './components/DiagramEditor';
import DiagramTypeModal from './components/DiagramTypeModal';

const initialDiagrams = [
  {
    id: 1,
    name: 'Процесс найма (BPMN)',
    type: 'BPMN',
    modelData: {
      "class": "GraphLinksModel",
      nodeDataArray: [],
      linkDataArray: [],
    },
  },
  {
    id: 2,
    name: 'База данных заказов (ERD)',
    type: 'ERD',
    modelData: {
      "class": "GraphLinksModel",
      nodeDataArray: [],
      linkDataArray: [],
    },
  }
];

function App() {
  const [diagrams, setDiagrams] = useState(initialDiagrams);
  const [activeDiagramId, setActiveDiagramId] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleAddDiagram = (name, type) => {
    const newDiagram = {
      id: Date.now(),
      name: name,
      type: type.toUpperCase(),
      modelData: {
        "class": "GraphLinksModel",
        nodeDataArray: [],
        linkDataArray: [],
      },
    };
    setDiagrams([...diagrams, newDiagram]);
    setActiveDiagramId(newDiagram.id);
    handleCloseModal();
  };

  const handleModelChange = useCallback((newModelDataString) => {
    try {
      const newModelData = JSON.parse(newModelDataString);
      setDiagrams(prevDiagrams =>
        prevDiagrams.map(diagram =>
          diagram.id === activeDiagramId
            ? { ...diagram, modelData: newModelData }
            : diagram
        )
      );
    } catch (e) {
      console.error("Failed to parse model data:", e);
    }
  }, [activeDiagramId]);

  const activeDiagram = diagrams.find(d => d.id === activeDiagramId);

  return (
    <div className="app-container">
      <TopBar />
      <DiagramTreePanel
        diagrams={diagrams}
        activeDiagramId={activeDiagramId}
        onSelectDiagram={setActiveDiagramId}
        onAddDiagram={handleOpenModal}
      />
      {activeDiagram ? (
        <DiagramEditor
          // *** ИСПРАВЛЕНИЕ: Ключ `key` удален, чтобы предотвратить повторное монтирование компонента ***
          diagramType={activeDiagram.type}
          modelData={activeDiagram.modelData}
          onModelChange={handleModelChange}
        />
      ) : (
        <div className="diagram-editor-container" style={{ display: 'grid', placeContent: 'center' }}>
            <p>Выберите диаграмму для редактирования.</p>
        </div>
      )}
      <ElementsSidebar activeDiagramType={activeDiagram?.type} />
      
      {isModalOpen && (
        <DiagramTypeModal 
          onClose={handleCloseModal}
          onCreate={handleAddDiagram} 
        />
      )}
    </div>
  );
}

export default App;