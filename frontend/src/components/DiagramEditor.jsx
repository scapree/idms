import React, { useRef, useEffect } from 'react';
import * as go from 'gojs';
import { setupBPMNDiagram, setupDFDDiagram, setupERDDiagram } from '../utils/diagramTemplates';

function DiagramEditor({ diagramType, modelData, onModelChange }) {
  const diagramRef = useRef(null);

  useEffect(() => {
    // Убедимся, что div для диаграммы уже в DOM
    if (!diagramRef.current) return;

    const $ = go.GraphObject.make;

    // Инициализируем диаграмму
    const diagram = $(go.Diagram, diagramRef.current, {
      'undoManager.isEnabled': true,
      'grid.visible': true,
      initialContentAlignment: go.Spot.Center,
      allowDrop: true,
    });

    // Настраиваем шаблоны в зависимости от типа диаграммы
    if (diagramType === 'BPMN') {
      setupBPMNDiagram(diagram, $);
    } else if (diagramType === 'DFD') {
      setupDFDDiagram(diagram, $);
    } else if (diagramType === 'ERD') {
      setupERDDiagram(diagram, $);
    }
    
    // Загружаем данные модели
    diagram.model = go.Model.fromJson(modelData);

    // Настраиваем Drag-and-Drop
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      const elementData = JSON.parse(data);
      // Преобразуем координаты окна в координаты диаграммы
      const point = diagram.transformViewToDoc(diagram.lastInput.viewPoint);
      
      diagram.model.commit(m => {
        const nodeData = { ...elementData, loc: go.Point.stringify(point) };
        m.addNodeData(nodeData);
      });
    };
    
    const canvas = diagramRef.current;
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);

    // Добавляем слушатель изменений модели для сохранения состояния
    const modelChangedListener = (e) => {
      // Сохраняем модель только по завершении транзакции (например, после перемещения узла)
      if (e.isTransactionFinished) {
        onModelChange(JSON.parse(e.model.toJson()));
      }
    };
    diagram.addModelChangedListener(modelChangedListener);

    // --- Функция очистки ---
    // React вызовет ее, когда компонент будет размонтирован (т.е. при смене `key` в App.jsx)
    return () => {
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
      
      // Правильно уничтожаем экземпляр диаграммы, чтобы избежать утечек памяти и ошибок
      diagram.div = null; 
    };

  // Зависимости хука. Эффект будет перезапускаться при изменении этих пропсов.
  // Использование `key` в App.jsx делает этот механизм еще надежнее.
  }, [diagramType, modelData, onModelChange]);

  return <div ref={diagramRef} className="diagram-editor-container" />;
}

export default DiagramEditor;