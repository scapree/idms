import React, { useRef, useEffect } from 'react';
import * as go from 'gojs';

function DiagramEditor({ modelData, onModelChange }) {
  const diagramRef = useRef(null);

  useEffect(() => {
    if (!diagramRef.current) return;

    const $ = go.GraphObject.make;

    const diagram = $(go.Diagram, diagramRef.current, {
      'undoManager.isEnabled': true,
      'grid.visible': true,
      'panningTool.isEnabled': true,
      'toolManager.mouseWheelBehavior': go.ToolManager.WheelZoom,
      // --- НОВОЕ: Настраиваем инструмент для создания связей ---
      // Указываем, что линковка должна происходить от порта к порту
      'linkingTool.direction': go.LinkingTool.ForwardsOnly,
      initialContentAlignment: go.Spot.Center,
      allowDrop: true,
    });

    // --- НОВОЕ: Функция для создания портов ---
    // Чтобы не дублировать код, создадим вспомогательную функцию,
    // которая будет генерировать для нас порты (маленькие круги).
    function makePort(name, align, spot, output, input) {
      return $(go.Shape, "Circle", {
        fill: "transparent",        // Прозрачный по умолчанию
        strokeWidth: 0,             // Без рамки по умолчанию
        width: 8, height: 8,        // Небольшой размер
        alignment: align,           // Расположение на узле (например, go.Spot.Top)
        stretch: go.GraphObject.Horizontal,
        portId: name,               // Уникальное имя порта (например, "T" для Top)
        fromSpot: spot,             // Откуда выходит связь
        fromLinkable: output,       // Можно ли начинать связь из этого порта
        toSpot: spot,               // Куда приходит связь
        toLinkable: input,          // Можно ли заканчивать связь в этом порту
        cursor: "pointer",          // Меняем курсор при наведении
        // --- Делаем порты видимыми при наведении мыши на узел ---
        mouseEnter: (e, port) => {
          if (!e.diagram.isReadOnly) port.fill = "#2a9d8f";
        },
        mouseLeave: (e, port) => {
          port.fill = "transparent";
        }
      });
    }

    // --- ИЗМЕНЕНИЕ: Обновляем шаблон узла, добавляя в него порты ---
    diagram.nodeTemplate = $(
      go.Node, 'Auto',
      { locationSpot: go.Spot.Center, shadowColor: "rgba(0,0,0,0.1)", shadowOffset: new go.Point(2, 2), shadowBlur: 4 },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      // Основная фигура
      $(go.Shape, 'RoundedRectangle', {
        parameter1: 10, fill: '#ffffff', strokeWidth: 2,
      }, new go.Binding('stroke', 'color')),
      // Текстовый блок
      $(go.TextBlock, {
        font: 'bold 14px Manrope, sans-serif', stroke: '#264653', margin: 12, editable: true,
      }, new go.Binding('text').makeTwoWay()),

      // --- Добавляем четыре порта к нашему узлу ---
      // a,b,c,d,e - параметры функции makePort(name, align, spot, output, input)
      makePort("T", go.Spot.Top, go.Spot.Top, true, true),      // Верхний порт
      makePort("L", go.Spot.Left, go.Spot.Left, true, true),    // Левый порт
      makePort("R", go.Spot.Right, go.Spot.Right, true, true),  // Правый порт
      makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, true) // Нижний порт
    );

    // Шаблон связей остается без изменений, он будет работать с новыми портами
    diagram.linkTemplate = $(
      go.Link, { 
        routing: go.Link.AvoidsNodes, 
        corner: 10, 
        curve: go.Link.JumpOver,
        relinkableFrom: true, // Разрешаем переподключать начало связи
        relinkableTo: true,   // Разрешаем переподключать конец связи
      },
      $(go.Shape, { strokeWidth: 2, stroke: '#264653' }),
      $(go.Shape, { toArrow: 'Standard', stroke: null, fill: '#264653' })
    );

    // ... остальной код (addModelChangedListener, handleDragOver, handleDrop, etc.) остается БЕЗ ИЗМЕНЕНИЙ ...
    diagram.addModelChangedListener((e) => {
      if (e.isTransactionFinished) {
        const newModel = JSON.parse(e.model.toJson());
        onModelChange(newModel);
      }
    });

    diagram.model = go.Model.fromJson(modelData);
    
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const { group, text } = JSON.parse(data);
      const colors = { BPMN: '#2a9d8f', ERD: '#e76f51', DFD: '#f4a261' };
      const point = diagram.transformViewToDoc(diagram.lastInput.viewPoint);
      diagram.model.commit(m => {
          m.addNodeData({
              text: text, color: colors[group] || '#264653', loc: go.Point.stringify(point),
          });
      });
    };
    
    const canvas = diagramRef.current;
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);

    return () => {
      diagram.div = null;
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
    };

  }, []);

  return <div ref={diagramRef} className="diagram-editor-container" />;
}

export default DiagramEditor;