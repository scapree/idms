// src/utils/diagramTemplates.js
import * as go from 'gojs';

// Вспомогательная функция для создания портов (точек для соединения)
export function makePort(name, spot, $) {
  return $(go.Shape, "Circle", {
    fill: "transparent", strokeWidth: 0, width: 10, height: 10,
    alignment: spot, portId: name,
    fromSpot: spot, toSpot: spot,
    fromLinkable: true, toLinkable: true,
    cursor: "pointer",
    mouseEnter: (e, port) => { if (!e.diagram.isReadOnly) port.fill = "rgba(42, 157, 143, 0.5)"; },
    mouseLeave: (e, port) => { port.fill = "transparent"; }
  });
}

// Иконки для BPMN задач
const bpmnIcons = {
  user: "M18.3,16.4c-0.4-0.8-1-1.5-1.7-2.1c-0.7-0.6-1.6-1-2.5-1.3c-1-0.3-2-0.4-3.1-0.4s-2.1,0.1-3.1,0.4c-1,0.3-1.8,0.7-2.5,1.3 c-0.7,0.6-1.3,1.3-1.7,2.1c-0.4,0.8-0.6,1.8-0.6,2.8c0,0.2,0,0.5,0.1,0.7c0,0.2,0.1,0.5,0.1,0.7c0.2,1.2,0.7,2.3,1.5,3.3 c0.8,1,1.8,1.8,3,2.4s2.4,0.9,3.8,0.9s2.6-0.3,3.8-0.9c1.1-0.6,2.1-1.4,3-2.4c0.8-1,1.3-2.1,1.5-3.3c0,0.2,0.1,0.5,0.1,0.7 c0,0.2,0.1,0.5,0.1,0.7C18.9,18.2,18.7,17.2,18.3,16.4z M12,12.1c1,0,1.9-0.4,2.7-1.1c0.7-0.7,1.1-1.7,1.1-2.7s-0.4-1.9-1.1-2.7 C13.9,4.9,13,4.5,12,4.5s-1.9,0.4-2.7,1.1c-0.7,0.7-1.1,1.7-1.1,2.7s0.4,1.9,1.1,2.7C10.1,11.7,11,12.1,12,12.1z",
  service: "M21.4,13.7c-0.2-0.2-0.2-0.3-0.1-0.5l0.5-1.6c0-0.1,0-0.2-0.1-0.3l-1.1-1.1c-0.1-0.1-0.2-0.1-0.3-0.1l-1.6,0.5 c-0.2,0-0.3-0.1-0.5-0.1c-0.2-0.4-0.5-0.8-0.8-1.2c-0.2-0.2-0.2-0.3-0.1-0.5l0.5-1.6c0-0.1,0-0.2-0.1-0.3l-1.1-1.1 c-0.1-0.1-0.2-0.1-0.3-0.1l-1.6,0.5c-0.2,0-0.3-0.1-0.5-0.1c-0.4-0.2-0.8-0.5-1.2-0.8c-0.2-0.2-0.3-0.2-0.5-0.1l-1.6,0.5 c-0.1,0-0.2,0-0.3-0.1l-1.1-1.1c-0.1-0.1-0.1-0.2-0.1-0.3l0.5-1.6c0-0.2-0.1-0.3-0.1-0.5C8.3,2.6,8.2,2.6,8,2.6l-1.6,0.5 C6.3,3.2,6.2,3.1,6.2,3C5.8,2.8,5.4,2.5,5,2.2C4.8,2,4.7,2,4.5,2.1L3,2.6C2.9,2.7,2.8,2.6,2.7,2.6L1.6,1.5C1.5,1.4,1.4,1.4,1.3,1.5 l0.5,1.6c0,0.2-0.1,0.3-0.1,0.5C1.3,4,1,4.4,0.8,4.8C0.6,5,0.6,5.1,0.5,5l-1.6-0.5C-1.2,4.5-1.3,4.5-1.4,4.6l-1.1,1.1 c-0.1,0.1-0.1,0.2-0.1,0.3l0.5,1.6c0,0.2-0.1,0.3-0.1,0.5c-0.2,0.4-0.5,0.8-0.8,1.2c-0.2,0.2-0.2,0.3-0.1,0.5l0.5,1.6 c0,0.1,0,0.2-0.1,0.3l-1.1,1.1c-0.1,0.1-0.2,0.1-0.3,0.1l-1.6-0.5c-0.2,0-0.3,0.1-0.5,0.1c-0.4,0.2-0.8,0.5-1.2,0.8 c-0.2,0.2-0.3,0.2-0.5,0.1l-1.6-0.5c-0.1,0-0.2,0-0.3,0.1l-1.1,1.1c-0.1,0.1-0.1,0.2,0,0.3l0.5,1.6c0,0.2,0,0.3-0.1,0.5 c-0.1,0.4-0.1,0.8-0.1,1.2s0,0.8,0.1,1.2c0,0.2-0.1,0.3-0.1,0.5l-0.5,1.6c0,0.1,0,0.2,0.1,0.3l1.1,1.1c0.1,0.1,0.2,0.1,0.3,0.1 l1.6-0.5c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8c0.2,0.2,0.3,0.2,0.5,0.1l1.6-0.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1 c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5c0.1,0.4,0.1,0.8,0.1,1.2s0,0.8-0.1,1.2c-0.1,0.2,0,0.3,0.1,0.5 l0.5,1.6c0,0.1,0,0.2,0.1,0.3l1.1,1.1c0.1,0.1,0.2,0.1,0.3,0.1l1.6-0.5c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8 c0.2,0.2,0.3,0.2,0.5,0.1l1.6-0.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5 c0.1,0.4,0.1,0.8,0.1,1.2s0,0.8-0.1,1.2c-0.1,0.2,0,0.3,0.1,0.5l0.5,1.6c0,0.1,0,0.2,0.1,0.3l1.1,1.1c0.1,0.1,0.2,0.1,0.3,0.1 l1.6-0.5c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8c0.2,0.2,0.3,0.2,0.5,0.1l1.6-0.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1 c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0-0.2,0.1-0.3,0.1-0.5c0.1-0.4,0.1-0.8,0.1-1.2s0-0.8-0.1-1.2c0-0.2,0.1-0.3,0.1-0.5 l0.5-1.6c0-0.1,0-0.2-0.1-0.3l-1.1-1.1c-0.1-0.1-0.2-0.1-0.3-0.1l-1.6,0.5c-0.2,0-0.3-0.1-0.5-0.1c-0.4-0.2-0.8-0.5-1.2-0.8 c-0.2-0.2-0.3-0.2-0.5-0.1l-1.6,0.5c-0.1,0-0.2,0-0.3-0.1l-1.1-1.1c-0.1-0.1-0.1-0.2-0.1-0.3l0.5-1.6c0-0.2-0.1-0.3-0.1-0.5 c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8c0.2,0.2,0.3,0.2,0.5,0.1l1.6-0.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1 c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5c0.1,0.4,0.1,0.8,0.1,1.2s0,0.8-0.1,1.2c-0.1,0.2,0,0.3,0.1,0.5l0.5,1.6 c0,0.1,0,0.2,0.1,0.3l1.1,1.1c0.1,0.1,0.2,0.1,0.3,0.1l1.6-0.5c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8 c0.2,0.2,0.3,0.2,0.5,0.1l1.6-0.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5 c0.1,0.4,0.1,0.8,0.1,1.2s0,0.8-0.1,1.2c-0.1,0.2,0,0.3,0.1,0.5l0.5,1.6c0,0.1,0,0.2,0.1,0.3L23,21.9c0.1,0.1,0.2,0.1,0.3,0.1 l1.6-0.5c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8c0.2,0.2,0.3,0.2,0.5,0.1L28.6,22c0.1,0,0.2,0,0.3,0.1l1.1,1.1 c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5c0.1,0.4,0.1,0.8,0.1,1.2s0,0.8-0.1,1.2c0,0.2,0,0.3,0.1,0.5L30.1,29 c0,0.1,0,0.2,0.1,0.3l1.1,1.1c0.1,0.1,0.2,0.1,0.3,0.1l1.6-0.5c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8 c0.2,0.2,0.3,0.2,0.5,0.1l1.6-0.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5 c0.1,0.4,0.1,0.8,0.1,1.2s0,0.8-0.1,1.2c-0.1,0.2,0,0.3,0.1,0.5l0.5,1.6c0,0.1,0,0.2,0.1,0.3l1.1,1.1c0.1,0.1,0.2,0.1,0.3,0.1 L41.4,36c0.2,0,0.3,0.1,0.5,0.1c0.4,0.2,0.8,0.5,1.2,0.8c0.2,0.2,0.3,0.2,0.5,0.1L45,36.5c0.1,0,0.2,0,0.3,0.1l1.1,1.1 c0.1,0.1,0.1,0.2,0.1,0.3l-0.5,1.6c0,0.2,0.1,0.3,0.1,0.5c0.1,0.4,0.1,0.8,0.1,1.2c0,0.4,0,0.8-0.1,1.2c0-0.2,0.1-0.3,0.1-0.5 l0.5-1.6c0-0.1,0-0.2-0.1-0.3l-1.1-1.1c-0.1-0.1-0.2-0.1-0.3-0.1l-1.6,0.5c-0.2,0-0.3-0.1-0.5-0.1c-0.4-0.2-0.8-0.5-1.2-0.8 c-0.2-0.2-0.3-0.2-0.5-0.1l-1.6,0.5c-0.1,0-0.2,0-0.3-0.1l-1.1-1.1c-0.1-0.1-0.1-0.2-0.1-0.3l0.5-1.6c0-0.2-0.1-0.3-0.1-0.5 c-0.1-0.4-0.1-0.8-0.1-1.2s0-0.8,0.1-1.2c0-0.2-0.1-0.3-0.1-0.5l-0.5-1.6c0-0.1,0-0.2,0.1-0.3l1.1-1.1c0.1-0.1,0.2-0.1,0.3-0.1 l1.6,0.5c0.2,0,0.3-0.1,0.5-0.1c0.4-0.2,0.8-0.5,1.2-0.8c0.2-0.2,0.3-0.2,0.5-0.1l1.6,0.5c0.1,0,0.2,0,0.3-0.1l1.1-1.1 c0.1-0.1,0.1-0.2,0.1-0.3l-0.5-1.6c0-0.2,0.1-0.3,0.1-0.5c0.1-0.4,0.1-0.8,0.1-1.2s0-0.8-0.1-1.2c0-0.2,0-0.3-0.1-0.5l-0.5-1.6 c0-0.1,0-0.2,0.1-0.3l1.1-1.1c0.1-0.1,0.2-0.1,0.3-0.1l1.6,0.5c0.2,0,0.3-0.1,0.5-0.1c0.4-0.2,0.8-0.5,1.2-0.8 c0.2-0.2,0.3-0.2,0.5-0.1l1.6,0.5c0.1,0,0.2,0,0.3-0.1l1.1-1.1C21.5,13.9,21.5,13.8,21.4,13.7z"
};
const bpmnUserIcon = go.Geometry.parse(bpmnIcons.user, true);
const bpmnServiceIcon = go.Geometry.parse(bpmnIcons.service, true);

// Кастомные фигуры
go.Shape.defineFigureGenerator("File", (shape, w, h) => {
    const geo = new go.Geometry();
    const fig = new go.PathFigure(0, 0, true); geo.add(fig);
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.2));
    fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.8, 0));
    fig.add(new go.PathSegment(go.PathSegment.Close));
    const fig2 = new go.PathFigure(w * 0.8, 0, false); geo.add(fig2);
    fig2.add(new go.PathSegment(go.PathSegment.Line, w * 0.8, h * 0.2));
    fig2.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.2));
    return geo;
});

go.Shape.defineFigureGenerator("Cylinder1", (shape, w, h) => {
    const geo = new go.Geometry();
    const c = 0.5;
    const fig = new go.PathFigure(w, c * h, true); geo.add(fig);
    fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
    fig.add(new go.PathSegment(go.PathSegment.Bezier, 0, h, w, (2 - c) * h, 0, (2 - c) * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, c * h));
    fig.add(new go.PathSegment(go.PathSegment.Bezier, w, c * h, 0, (2 * c - 1) * h, w, (2 * c - 1) * h).close());
    return geo;
});

// === BPMN ===
export function setupBPMNDiagram(diagram, $) {
  // Event
  diagram.nodeTemplateMap.add("event", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center, toolTip: $(go.Adornment, "Auto", $(go.TextBlock, { margin: 4 }, new go.Binding("text"))) },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Circle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 45, height: 45 },
      new go.Binding("strokeWidth", "eventType", t => t === 2 ? 5 : 2)), // End event has thicker stroke
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(80, NaN), editable: true, margin: 5 },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Activity
  diagram.nodeTemplateMap.add("activity", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "RoundedRectangle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, parameter1: 10, width: 100, height: 70 }),
    $(go.Panel, "Table",
        { maxSize: new go.Size(100, 70) },
        // Иконка в левом верхнем углу
        $(go.Shape, {
                alignment: go.Spot.TopLeft, margin: new go.Margin(8, 0, 0, 8),
                width: 16, height: 16, fill: "#2a9d8f", stroke: null
            },
            new go.Binding("geometry", "taskType", (t) => {
                if (t === 2) return bpmnUserIcon;
                if (t === 3) return bpmnServiceIcon;
                return null;
            }),
            new go.Binding("visible", "taskType", t => t === 2 || t === 3)
        ),
        // Текст по центру
        $(go.TextBlock,
            {
                font: "12px Manrope, sans-serif",
                stroke: "#264653",
                margin: 10,
                maxSize: new go.Size(90, 50),
                editable: true,
                alignment: go.Spot.Center
            },
            new go.Binding("text").makeTwoWay())
    ),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Gateway
  diagram.nodeTemplateMap.add("gateway", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Diamond", { fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, width: 50, height: 50 }),
    $(go.TextBlock, { font: "bold 24px sans-serif", stroke: "#264653", alignment: go.Spot.Center },
      new go.Binding("text", "gatewayType", t => t === 1 ? "X" : t === 2 ? "+" : t === 3 ? "O" : "")),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("dataobject", $(go.Node, "Spot", { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "File", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 60, height: 75 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(50, NaN), margin: 8, editable: true }, new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $), makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("datastore", $(go.Node, "Spot", { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Cylinder1", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 70, height: 70 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(60, NaN), margin: 8, editable: true }, new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $), makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("annotation", $(go.Node, "Spot", { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { fill: "transparent", stroke: "#e76f51", strokeWidth: 1, width: 120, height: 60 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#e76f51", maxSize: new go.Size(110, NaN), margin: 4, editable: true }, new go.Binding("text").makeTwoWay())
  ));

  // Link
  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 10, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.Shape, { toArrow: "Standard", fill: "#264653", stroke: null, scale: 1.5 }),
    $(go.TextBlock, { font: "10px Manrope, sans-serif", stroke: "#264653", segmentOffset: new go.Point(0, -12), editable: true },
      new go.Binding("text").makeTwoWay())
  );
}

// === DFD ===
export function setupDFDDiagram(diagram, $) {
  diagram.nodeTemplateMap.add("process", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Circle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 90, height: 90 }),
    $(go.TextBlock, { font: "12px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(80, NaN), margin: 5, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("store", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Panel, "Vertical",
      $(go.Shape, { stroke: "#e9c46a", strokeWidth: 2, width: 100, height: 0, geometryString: "M0 0 L100 0" }),
      $(go.TextBlock, { font: "12px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(90, NaN), margin: new go.Margin(8, 5, 8, 5), editable: true },
        new go.Binding("text").makeTwoWay()),
      $(go.Shape, { stroke: "#e9c46a", strokeWidth: 2, width: 100, height: 0, geometryString: "M0 0 L100 0" })
    ),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("external", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { fill: "#ffffff", stroke: "#e76f51", strokeWidth: 2, width: 110, height: 60 }),
    $(go.TextBlock, { font: "12px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(100, NaN), margin: 5, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 10, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.Shape, { toArrow: "Standard", fill: "#264653", stroke: null, scale: 1.5 }),
    $(go.TextBlock, { font: "10px Manrope, sans-serif", stroke: "#264653", segmentOffset: new go.Point(0, -12), editable: true },
      new go.Binding("text").makeTwoWay())
  );
}

// === ERD ===
export function setupERDDiagram(diagram, $) {
  const itemTemplate =
    $(go.Panel, "Horizontal",
      $(go.Shape,
        { desiredSize: new go.Size(10, 10), margin: new go.Margin(2, 4, 2, 0), fill: "#264653", stroke: null },
        new go.Binding("figure", "iskey", k => k ? "Decision" : "Ellipse"),
        new go.Binding("fill", "iskey", k => k ? "#e9c46a" : "#264653")),
      $(go.TextBlock,
        { font: "11px Manrope, sans-serif", stroke: "#264653", editable: true },
        new go.Binding("text", "name").makeTwoWay())
    );

  diagram.nodeTemplateMap.add("entity", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2 }),
    $(go.Panel, "Vertical", { defaultAlignment: go.Spot.Left, margin: 4 },
      // Header
      $(go.Panel, "Horizontal", { defaultAlignment: go.Spot.Center, stretch: go.GraphObject.Horizontal, background: "#2a9d8f" },
        $(go.TextBlock,
          { font: "bold 12px Manrope, sans-serif", stroke: "white", margin: 4, editable: true },
          new go.Binding("text").makeTwoWay())
      ),
      // Items
      $(go.Panel, "Vertical",
        {
          padding: 4,
          margin: 2,
          defaultAlignment: go.Spot.Left,
          itemTemplate: itemTemplate
        },
        new go.Binding("itemArray", "items")
      )
    )
  ));

  diagram.nodeTemplateMap.add("attribute", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Ellipse", { fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, width: 100, height: 60 }),
    $(go.TextBlock, { font: "12px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(90, NaN), margin: 5, editable: true },
      new go.Binding("text").makeTwoWay())
  ));

  diagram.nodeTemplateMap.add("relationship", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center, fromSpot: go.Spot.AllSides, toSpot: go.Spot.AllSides },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Diamond", { fill: "#ffffff", stroke: "#e76f51", strokeWidth: 2, width: 100, height: 70 }),
    $(go.TextBlock, { font: "12px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(90, NaN), margin: 5, editable: true },
      new go.Binding("text").makeTwoWay())
  ));

  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 10, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    // fromLabel
    $(go.TextBlock, "1",
      {
        font: "11px Manrope, sans-serif", stroke: "#264653", background: "white",
        segmentIndex: 1, segmentFraction: 0.1, editable: true
      },
      new go.Binding("text", "fromText").makeTwoWay()
    ),
    // toLabel
    $(go.TextBlock, "N",
      {
        font: "11px Manrope, sans-serif", stroke: "#264653", background: "white",
        segmentIndex: -2, segmentFraction: 0.9, editable: true
      },
      new go.Binding("text", "toText").makeTwoWay()
    )
  );
}