import React, { useState, useCallback } from 'react';
import './index.css';
import './App.css';
import TopBar from './components/TopBar';
import DiagramTreePanel from './components/DiagramTreePanel';
import ElementsSidebar from './components/ElementsSidebar';
import DiagramEditor from './components/DiagramEditor';
import DiagramTypeModal from './components/DiagramTypeModal'; // Предполагается, что вы захотите использовать этот компонент

const initialDiagrams = [
  {
    id: 1,
    name: 'Главный процесс (BPMN)',
    type: 'BPMN',
    modelData: {
      "class": "GraphLinksModel",
      nodeDataArray: [],
      linkDataArray: [],
    },
  },
];

function App() {
  const [diagrams, setDiagrams] = useState(initialDiagrams);
  const [activeDiagramId, setActiveDiagramId] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модального окна

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
    handleCloseModal(); // Закрываем модальное окно после создания
  };

  const handleModelChange = useCallback((newModelData) => {
    setDiagrams(prevDiagrams =>
      prevDiagrams.map(diagram =>
        diagram.id === activeDiagramId
          ? { ...diagram, modelData: newModelData }
          : diagram
      )
    );
  }, [activeDiagramId]);

  const activeDiagram = diagrams.find(d => d.id === activeDiagramId);

  return (
    <div className="app-container">
      <TopBar />
      <DiagramTreePanel
        diagrams={diagrams}
        activeDiagramId={activeDiagramId}
        onSelectDiagram={setActiveDiagramId}
        onAddDiagram={handleOpenModal} // Открываем модальное окно по кнопке
      />
      {activeDiagram && (
        <DiagramEditor
          key={activeDiagramId} // Ключ здесь КРАЙНЕ ВАЖЕН для правильной работы GoJS
          diagramType={activeDiagram.type}
          modelData={activeDiagram.modelData}
          onModelChange={handleModelChange}
        />
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