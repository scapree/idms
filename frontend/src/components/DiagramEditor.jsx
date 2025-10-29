import React, { useRef, useEffect } from 'react';
import * as go from 'gojs';

function DiagramEditor({ modelData, onModelChange }) {
  const diagramRef = useRef(null);
  const diagramInstanceRef = useRef(null);

  useEffect(() => {
    if (!diagramRef.current || diagramInstanceRef.current) return;

    const $ = go.GraphObject.make;

    const diagram = $(go.Diagram, diagramRef.current, {
      'undoManager.isEnabled': true,
      'grid.visible': true,
      'animationManager.isEnabled': false,
      initialContentAlignment: go.Spot.Center,
      allowDrop: true,
    });

    // Функция для создания портов
    function makePort(name, align, spot, output, input) {
      return $(go.Shape, "Circle", {
        fill: "transparent",
        strokeWidth: 0,
        width: 12,
        height: 12,
        alignment: align,
        portId: name,
        fromSpot: spot,
        fromLinkable: output,
        toSpot: spot,
        toLinkable: input,
        cursor: "pointer",
        mouseEnter: (e, port) => {
          if (!e.diagram.isReadOnly) {
            port.fill = "#2a9d8f";
            port.strokeWidth = 2;
            port.stroke = "white";
          }
        },
        mouseLeave: (e, port) => {
          port.fill = "transparent";
          port.strokeWidth = 0;
        }
      });
    }

    // Правильные фигуры и размеры по стандартам
    function getNodeTemplate(text) {
      // BPMN 2.0 Standard
      if (text === 'Start Event') {
        return {
          figure: 'Circle',
          width: 40,
          height: 40,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      if (text === 'End Event') {
        return {
          figure: 'Circle',
          width: 40,
          height: 40,
          strokeWidth: 4,
          fill: 'white'
        };
      }
      if (text === 'Task') {
        return {
          figure: 'RoundedRectangle',
          width: 120,
          height: 80,
          strokeWidth: 2,
          fill: 'white',
          parameter1: 10
        };
      }
      if (text === 'Gateway') {
        return {
          figure: 'Diamond',
          width: 50,
          height: 50,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      
      // ERD - Chen Notation (самая распространенная)
      if (text === 'Entity') {
        return {
          figure: 'Rectangle',
          width: 120,
          height: 60,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      if (text === 'Attribute') {
        return {
          figure: 'Ellipse',
          width: 100,
          height: 50,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      if (text === 'Relationship') {
        return {
          figure: 'Diamond',
          width: 120,
          height: 60,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      
      // DFD - Yourdon/DeMarco Notation
      if (text === 'Process') {
        return {
          figure: 'Circle',
          width: 80,
          height: 80,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      if (text === 'Data Store') {
        return {
          figure: 'ManualInput', // Параллельные линии
          width: 120,
          height: 40,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      if (text === 'External Entity') {
        return {
          figure: 'Rectangle',
          width: 100,
          height: 60,
          strokeWidth: 2,
          fill: 'white'
        };
      }
      if (text === 'Data Flow') {
        return {
          figure: 'RoundedRectangle',
          width: 120,
          height: 60,
          strokeWidth: 2,
          fill: 'white',
          parameter1: 5
        };
      }
      
      return {
        figure: 'RoundedRectangle',
        width: 120,
        height: 60,
        strokeWidth: 2,
        fill: 'white',
        parameter1: 10
      };
    }

    // Универсальный шаблон узла с динамическими параметрами
    diagram.nodeTemplate = $(
      go.Node, 'Auto',
      { 
        locationSpot: go.Spot.Center,
        selectionAdorned: true,
        resizable: false,
        shadowVisible: false
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      
      $(go.Shape, {
        portId: "",
        fromLinkable: true,
        toLinkable: true,
        cursor: "pointer"
      },
        new go.Binding('figure', 'text', t => getNodeTemplate(t).figure),
        new go.Binding('width', 'text', t => getNodeTemplate(t).width),
        new go.Binding('height', 'text', t => getNodeTemplate(t).height),
        new go.Binding('strokeWidth', 'text', t => getNodeTemplate(t).strokeWidth),
        new go.Binding('fill', 'text', t => getNodeTemplate(t).fill),
        new go.Binding('parameter1', 'text', t => getNodeTemplate(t).parameter1 || 0),
        new go.Binding('stroke', 'color')
      ),
      
      $(go.TextBlock, {
        font: 'bold 11px Manrope, sans-serif',
        stroke: '#264653',
        margin: 8,
        maxSize: new go.Size(100, NaN),
        wrap: go.TextBlock.WrapFit,
        textAlign: 'center',
        editable: true,
        overflow: go.TextBlock.OverflowEllipsis
      }, new go.Binding('text').makeTwoWay()),

      // Порты для связывания
      makePort("T", go.Spot.Top, go.Spot.Top, true, true),
      makePort("L", go.Spot.Left, go.Spot.Left, true, true),
      makePort("R", go.Spot.Right, go.Spot.Right, true, true),
      makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, true)
    );

    // Шаблон связей
    diagram.linkTemplate = $(
      go.Link,
      { 
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        toShortLength: 4,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
        resegmentable: true,
        selectable: true
      },
      new go.Binding('points').makeTwoWay(),
      $(go.Shape, { strokeWidth: 2, stroke: '#264653' }),
      $(go.Shape, { toArrow: 'Standard', strokeWidth: 0, fill: '#264653', scale: 1.5 })
    );

    // Обработчик изменений модели
    const modelListener = (e) => {
      if (e.isTransactionFinished) {
        const newModel = JSON.parse(e.model.toJson());
        onModelChange(newModel);
      }
    };
    
    diagram.addModelChangedListener(modelListener);

    // Drag & Drop
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      
      const { group, text } = JSON.parse(data);
      const colors = { BPMN: '#2a9d8f', ERD: '#e76f51', DFD: '#f4a261' };
      const point = diagram.transformViewToDoc(new go.Point(e.offsetX, e.offsetY));
      
      diagram.startTransaction('add node');
      diagram.model.addNodeData({
        text: text,
        color: colors[group] || '#264653',
        loc: go.Point.stringify(point),
      });
      diagram.commitTransaction('add node');
    };

    const canvas = diagramRef.current;
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);

    diagramInstanceRef.current = diagram;

    return () => {
      diagram.removeModelChangedListener(modelListener);
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
      diagram.div = null;
      diagramInstanceRef.current = null;
    };
  }, [onModelChange]);

  // Обновление модели при изменении modelData
  useEffect(() => {
    if (diagramInstanceRef.current && modelData) {
      const diagram = diagramInstanceRef.current;
      diagram.model = go.Model.fromJson(modelData);
    }
  }, [modelData]);

  return <div ref={diagramRef} className="diagram-editor-container" />;
}

export default DiagramEditor;