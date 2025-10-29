// src/utils/diagramTemplates.js
import * as go from 'gojs';
import { makePort, bpmnUserIcon, bpmnServiceIcon } from './diagramUtils'; 
import { createEntityAdornment, createAttributeItemTemplate } from '../components/NodeActionButtons';

// === ОБЩИЕ СВОЙСТВА ДЛЯ УЗЛОВ И ТЕКСТА ===
const SHARED_NODE_PROPERTIES = {
  locationSpot: go.Spot.Center,
  rotatable: false,
  resizable: true,
  resizeObjectName: "SHAPE", // Указываем, какой объект масштабировать
};

const SHARED_TEXT_PROPERTIES = {
  font: "12px Manrope, sans-serif",
  stroke: "#264653",
  margin: 8,
  maxSize: new go.Size(120, NaN),
  wrap: go.TextBlock.WrapFit, // Автоматический перенос текста
  editable: true,
};


// === BPMN ===
export function setupBPMNDiagram(diagram, $) {
  // Event (Событие)
  diagram.nodeTemplateMap.add("event", $(go.Node, "Spot", { ...SHARED_NODE_PROPERTIES },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Circle", { name: "SHAPE", fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 45, height: 45 },
      new go.Binding("strokeWidth", "eventType", t => t === 2 ? 4 : 2)), // Конечное событие жирнее
    $(go.TextBlock, { ...SHARED_TEXT_PROPERTIES, maxSize: new go.Size(80, NaN) }, new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Activity (Задача)
  diagram.nodeTemplateMap.add("activity", $(go.Node, "Spot", { ...SHARED_NODE_PROPERTIES },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "RoundedRectangle", { name: "SHAPE", fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, parameter1: 10, minSize: new go.Size(120, 80) }),
    $(go.Panel, "Table", { maxSize: new go.Size(120, 80) },
      $(go.Shape, { alignment: go.Spot.TopLeft, margin: new go.Margin(8, 0, 0, 8), width: 16, height: 16, fill: "#2a9d8f", stroke: null },
        new go.Binding("geometry", "taskType", t => (t === 2) ? bpmnUserIcon : (t === 3) ? bpmnServiceIcon : null),
        new go.Binding("visible", "taskType", t => t === 2 || t === 3)),
      $(go.TextBlock, { ...SHARED_TEXT_PROPERTIES, alignment: go.Spot.Center }, new go.Binding("text").makeTwoWay())
    ),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Gateway (Шлюз)
  diagram.nodeTemplateMap.add("gateway", $(go.Node, "Spot", { ...SHARED_NODE_PROPERTIES, resizable: false },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Diamond", { name: "SHAPE", fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, width: 50, height: 50 }),
    $(go.TextBlock, { font: "bold 24px sans-serif", stroke: "#264653" },
      new go.Binding("text", "gatewayType", t => t === 1 ? "X" : t === 2 ? "+" : t === 3 ? "O" : "")),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));
  
  // Pool and Lane (Пул и Дорожка)
  diagram.groupTemplateMap.add("Pool", $(go.Group, "Vertical",
    {
      selectionObjectName: "SHAPE",
      locationObjectName: "SHAPE",
      resizable: true,
      resizeObjectName: "SHAPE",
      computesBoundsIncludingLinks: false,
      computesBoundsIncludingLocation: true,
      handlesDragDropForMembers: true,
      layout: $(go.LayeredDigraphLayout, {
        isInitial: false, isOngoing: false, direction: 0, columnSpacing: 10, layeringOption: go.LayeredDigraphLayout.LayerLongestPathSource
      })
    },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.TextBlock,
      { font: "bold 14px Manrope, sans-serif", editable: true,
        alignment: go.Spot.Center, angle: 270, margin: new go.Margin(0, 0, 0, 4) },
      new go.Binding("text").makeTwoWay()),
    $(go.Panel, "Auto",
      $(go.Shape, "Rectangle", { name: "SHAPE", fill: "transparent", stroke: "#264653", strokeWidth: 2, minSize: new go.Size(300, 150) }),
      $(go.Placeholder, { padding: 10, alignment: go.Spot.TopLeft })
    )
  ));


  // Link (Связь)
  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 10, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.Shape, { toArrow: "Standard", fill: "#264653", stroke: null, scale: 1.5 })
  );
}

// === DFD ===
export function setupDFDDiagram(diagram, $) {
  // Process (Процесс)
  diagram.nodeTemplateMap.add("process", $(go.Node, "Spot", { ...SHARED_NODE_PROPERTIES },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Circle", { name: "SHAPE", fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, minSize: new go.Size(100, 100) }),
    $(go.TextBlock, { ...SHARED_TEXT_PROPERTIES, textAlign: "center" }, new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Data Store (Хранилище данных)
  diagram.nodeTemplateMap.add("store", $(go.Node, "Spot", { ...SHARED_NODE_PROPERTIES },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { name: "SHAPE", fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, minSize: new go.Size(140, 60), geometryString: "M0 0 H140 M0 60 H140" }),
    $(go.TextBlock, { ...SHARED_TEXT_PROPERTIES, margin: new go.Margin(8, 2, 8, 2) }, new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // External Entity (Внешняя сущность)
  diagram.nodeTemplateMap.add("external", $(go.Node, "Spot", { ...SHARED_NODE_PROPERTIES },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { name: "SHAPE", fill: "#ffffff", stroke: "#e76f51", strokeWidth: 2, minSize: new go.Size(120, 70) }),
    $(go.TextBlock, { ...SHARED_TEXT_PROPERTIES, textAlign: "center" }, new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Data Flow (Поток данных)
  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 10, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.Shape, { toArrow: "Standard", fill: "#264653", stroke: null, scale: 1.5 }),
    $(go.TextBlock, { ...SHARED_TEXT_PROPERTIES, stroke: "#264653", segmentOffset: new go.Point(0, -12), editable: true },
      new go.Binding("text").makeTwoWay())
  );
}

// === ERD ===
export function setupERDDiagram(diagram, $) {
  // Определяем кастомные стрелки "Куриная лапка" для кардинальности
  go.Shape.defineArrowheadGeometry("One", "M0 0 L0 12 M-4 6 L4 6");
  go.Shape.defineArrowheadGeometry("Many", "M0 0 L-8 6 M0 0 L-8 -6");
  go.Shape.defineArrowheadGeometry("ZeroOrOne", "M-6 0 A6 6 0 1 1 6 0 A6 6 0 1 1 -6 0z M8 0 L8 12 M4 6 L12 6");
  go.Shape.defineArrowheadGeometry("OneOrMany", "M8 0 L0 0 L-8 6 M0 0 L-8 -6 M8 0 L8 12 M4 6 L12 6");
  go.Shape.defineArrowheadGeometry("ZeroOrMany", "M-6 0 A6 6 0 1 1 6 0 A6 6 0 1 1 -6 0z M8 0 L0 0 L-8 6 M0 0 L-8 -6");

  // Шаблон для одного атрибута (импортируется из NodeActionButtons.jsx)
  const attributeItemTemplate = createAttributeItemTemplate($);

  // Шаблон для Сущности
  diagram.nodeTemplateMap.add("entity", $(go.Node, "Spot", // "Spot" позволяет размещать порты поверх панели
    {
      ...SHARED_NODE_PROPERTIES,
      selectionAdornmentTemplate: createEntityAdornment($) // Применяем кастомное меню с кнопкой "Add Attribute"
    },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    
    // Основной видимый контейнер сущности
    $(go.Panel, "Auto",
      $(go.Shape, "Rectangle", { name: "SHAPE", fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, minSize: new go.Size(150, 75) }),
      $(go.Panel, "Vertical", { defaultAlignment: go.Spot.Left, margin: 0 },
        // Заголовок
        $(go.Panel, "Horizontal", { stretch: go.GraphObject.Horizontal, background: "#2a9d8f", padding: 6 },
          $(go.TextBlock, { font: "bold 13px Manrope, sans-serif", stroke: "white", editable: true }, new go.Binding("text").makeTwoWay())
        ),
        // Панель для списка атрибутов
        $(go.Panel, "Vertical", { name: "ITEMS_PANEL", padding: 4, margin: 2, defaultAlignment: go.Spot.Left, itemTemplate: attributeItemTemplate },
          new go.Binding("itemArray", "items")
        )
      )
    ),

    // ЯВНЫЕ НЕВИДИМЫЕ ПОРТЫ для создания связей. Решает проблему конфликта с изменением размера.
    makePort("T", go.Spot.Top, $),
    makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $),
    makePort("B", go.Spot.Bottom, $)
  ));
  
  // Шаблон для Связей
  diagram.linkTemplate = $(go.Link,
    { 
      routing: go.Link.AvoidsNodes, // Улучшенная маршрутизация, чтобы связи не пересекали узлы
      curve: go.Link.JumpOver, 
      corner: 10, 
      relinkableFrom: true, relinkableTo: true, 
      fromShortLength: 4, toShortLength: 4 
    },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    // Привязываем стрелки к данным модели (например, 'fromCardinality: "Many"')
    $(go.Shape, { stroke: "#264653", strokeWidth: 2, fill: "white" }, new go.Binding("fromArrow", "fromCardinality")),
    $(go.Shape, { stroke: "#264653", strokeWidth: 2, fill: "white" }, new go.Binding("toArrow", "toCardinality"))
  );
}