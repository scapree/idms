// src/components/DiagramEditor.jsx
import React, { useRef, useEffect } from 'react';
import * as go from 'gojs';
import { setupBPMNDiagram, setupDFDDiagram, setupERDDiagram } from '../utils/diagramTemplates';

function DiagramEditor({ diagramType, modelData, onModelChange }) {
  const divRef = useRef(null);
  const diagramRef = useRef(null);

  useEffect(() => {
    if (!divRef.current) return;

    const $ = go.GraphObject.make;

    // Уничтожаем старую диаграмму, если она была
    if (diagramRef.current) {
      diagramRef.current.div = null;
      diagramRef.current = null;
    }

    // Создаём новую
    const diagram = $(go.Diagram, divRef.current, {
      'undoManager.isEnabled': true,
      'grid.visible': true,
      initialContentAlignment: go.Spot.Center,
      allowDrop: true,
    });

    // Шаблоны
    if (diagramType === 'BPMN') setupBPMNDiagram(diagram, $);
    else if (diagramType === 'DFD') setupDFDDiagram(diagram, $);
    else if (diagramType === 'ERD') setupERDDiagram(diagram, $);

    // Загружаем модель
    try {
      diagram.model = go.Model.fromJson(modelData);
    } catch (e) {
      console.warn('Invalid modelData:', e);
    }

    // Drag & Drop
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;

      let data;
      try { data = JSON.parse(raw); } catch { return; }

      const rect = divRef.current.getBoundingClientRect();
      const pt = diagram.transformViewToDoc(
        new go.Point(e.clientX - rect.left, e.clientY - rect.top)
      );

      diagram.startTransaction('add node');
      diagram.model.addNodeData({ ...data, loc: go.Point.stringify(pt) });
      diagram.commitTransaction('add node');
    };

    const div = divRef.current;
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);

    // Слушаем изменения
    const listener = (e) => {
      if (e.isTransactionFinished) {
        onModelChange(e.model.toJson());
      }
    };
    diagram.addModelChangedListener(listener);

    diagramRef.current = diagram;

    // Очистка
    return () => {
      div.removeEventListener('dragover', handleDragOver);
      div.removeEventListener('drop', handleDrop);
      diagram.removeModelChangedListener(listener);
      if (diagramRef.current) {
        diagramRef.current.div = null;
        diagramRef.current = null;
      }
    };
  }, [diagramType, modelData, onModelChange]);

  return <div ref={divRef} className="diagram-editor-container" />;
}

export default DiagramEditor;