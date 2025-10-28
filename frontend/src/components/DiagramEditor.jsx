// src/components/DiagramEditor.jsx
import React, { useRef, useEffect, useLayoutEffect } from 'react';
import * as go from 'gojs';
import { setupBPMNDiagram, setupDFDDiagram, setupERDDiagram } from '../utils/diagramTemplates';

function DiagramEditor({ diagramType, modelData, onModelChange }) {
  const divRef = useRef(null);
  const diagramRef = useRef(null);

  // Этот эффект отвечает за создание и уничтожение экземпляра диаграммы.
  // Он запускается только один раз при монтировании компонента.
  useEffect(() => {
    if (!divRef.current) return;
    const $ = go.GraphObject.make;

    const diagram = $(go.Diagram, divRef.current, {
      'undoManager.isEnabled': true,
      'grid.visible': true,
      initialContentAlignment: go.Spot.Center,
      allowDrop: true,
    });

    diagramRef.current = diagram;

    // Настройка Drag & Drop
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      let data;
      try { data = JSON.parse(raw); } catch { return; }

      const rect = divRef.current.getBoundingClientRect();
      const pt = diagram.transformViewToDoc(new go.Point(e.clientX - rect.left, e.clientY - rect.top));

      diagram.startTransaction('add node');
      const model = diagram.model;
      const newNodeData = { ...data, loc: go.Point.stringify(pt) };
      
      if (newNodeData.isGroup) {
        model.addNodeData(newNodeData);
      } else {
        const group = diagram.findPartAt(pt, true);
        if (group instanceof go.Group) {
          newNodeData.group = group.key;
        }
        model.addNodeData(newNodeData);
      }
      diagram.commitTransaction('add node');
    };

    const div = divRef.current;
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);

    // Слушатель изменений модели для сохранения
    const listener = (e) => {
      if (e.isTransactionFinished) {
        onModelChange(e.model.toJson());
      }
    };
    diagram.addModelChangedListener(listener);

    // Очистка при размонтировании
    return () => {
      div.removeEventListener('dragover', handleDragOver);
      div.removeEventListener('drop', handleDrop);
      diagram.removeModelChangedListener(listener);
      diagram.div = null;
    };
  }, [onModelChange]); // Зависимость onModelChange здесь, чтобы listener всегда был актуальным


  // Этот эффект отвечает за обновление шаблонов и модели при смене диаграммы.
  useLayoutEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram) return;
    const $ = go.GraphObject.make;

    // *** КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ***
    // 1. Сначала ЗАМЕНЯЕМ МОДЕЛЬ. Это должно происходить вне транзакции.
    const modelAsObject = typeof modelData === 'string' ? JSON.parse(modelData) : modelData;
    diagram.model = go.Model.fromJson(modelAsObject);

    // 2. Только ПОСЛЕ установки модели, в отдельной транзакции, мы настраиваем шаблоны.
    diagram.startTransaction("change templates");
    
    diagram.nodeTemplateMap.clear();
    diagram.linkTemplateMap.clear();
    diagram.groupTemplateMap.clear();

    if (diagramType === 'BPMN') setupBPMNDiagram(diagram, $);
    else if (diagramType === 'DFD') setupDFDDiagram(diagram, $);
    else if (diagramType === 'ERD') setupERDDiagram(diagram, $);
    
    diagram.commitTransaction("change templates");

  }, [diagramType, modelData]); // Этот эффект перезапускается при смене типа диаграммы или ее данных

  return <div ref={divRef} className="diagram-editor-container" />;
}

export default DiagramEditor;