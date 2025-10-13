import React, { useState, useCallback } from 'react'; // Импортируем useCallback
import './index.css';
import './App.css';
import TopBar from './components/TopBar';
import DiagramTreePanel from './components/DiagramTreePanel';
import ElementsSidebar from './components/ElementsSidebar';
import DiagramEditor from './components/DiagramEditor';

const initialDiagrams = [
  {
    id: 1,
    name: 'Главный процесс (BPMN)',
    modelData: {
      "class": "GraphLinksModel", // Явно указываем класс модели для GoJS
      nodeDataArray: [
        { key: 'alpha', text: 'Начало', color: '#2a9d8f', loc: '0 0' },
        { key: 'beta', text: 'Процесс', color: '#e9c46a', loc: '200 50' },
      ],
      linkDataArray: [{ from: 'alpha', to: 'beta' }],
    },
  },
];

function App() {
  const [diagrams, setDiagrams] = useState(initialDiagrams);
  const [activeDiagramId, setActiveDiagramId] = useState(1);

  const handleAddDiagram = () => {
    const name = prompt("Введите название новой диаграммы:", "Новая диаграмма");
    if (name) {
      const newDiagram = {
        id: Date.now(),
        name: name,
        modelData: {
          "class": "GraphLinksModel",
          nodeDataArray: [],
          linkDataArray: [],
        },
      };
      setDiagrams([...diagrams, newDiagram]);
      setActiveDiagramId(newDiagram.id);
    }
  };

  // --- ИЗМЕНЕНИЕ: Оборачиваем в useCallback ---
  const handleModelChange = useCallback((newModelData) => {
    setDiagrams(prevDiagrams =>
      prevDiagrams.map(diagram =>
        diagram.id === activeDiagramId
          ? { ...diagram, modelData: newModelData }
          : diagram
      )
    );
  }, [activeDiagramId]); // Зависимость: функция будет создана заново только при смене activeDiagramId

  const activeDiagram = diagrams.find(d => d.id === activeDiagramId);

  return (
    <div className="app-container">
      <TopBar />
      <DiagramTreePanel
        diagrams={diagrams}
        activeDiagramId={activeDiagramId}
        onSelectDiagram={setActiveDiagramId}
        onAddDiagram={handleAddDiagram}
      />
      {/* --- ИЗМЕНЕНИЕ: Добавляем проверку на существование activeDiagram --- */}
      {activeDiagram && (
        <DiagramEditor
          key={activeDiagramId}
          modelData={activeDiagram.modelData}
          onModelChange={handleModelChange}
        />
      )}
      <ElementsSidebar />
    </div>
  );
}

export default App;