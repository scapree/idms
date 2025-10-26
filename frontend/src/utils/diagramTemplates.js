// src/utils/diagramTemplates.js
import * as go from 'gojs';

export function makePort(name, spot, $) {
  return $(go.Shape, "Circle", {
    fill: "transparent", strokeWidth: 0, width: 8, height: 8,
    alignment: spot, portId: name,
    fromSpot: spot, toSpot: spot,
    fromLinkable: true, toLinkable: true,
    cursor: "pointer",
    mouseEnter: (e, port) => { if (!e.diagram.isReadOnly) port.fill = "#2a9d8f"; },
    mouseLeave: (e, port) => { port.fill = "transparent"; }
  });
}

// === BPMN ===
export function setupBPMNDiagram(diagram, $) {
  // Фигуры
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

  // Event
  diagram.nodeTemplateMap.add("event", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Circle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 50, height: 50 },
      new go.Binding("strokeWidth", "eventType", t => t === 2 ? 4 : 2)),
    $(go.TextBlock, { font: "10px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(45, NaN), editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Activity
  diagram.nodeTemplateMap.add("activity", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "RoundedRectangle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, parameter1: 10, width: 100, height: 60 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(90, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Gateway
  diagram.nodeTemplateMap.add("gateway", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Diamond", { fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, width: 50, height: 50 }),
    $(go.TextBlock, { font: "bold 20px sans-serif", stroke: "#264653", alignment: go.Spot.Center },
      new go.Binding("text", "gatewayType", t => t === 1 ? "X" : t === 2 ? "+" : t === 3 ? "O" : "")),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // DataObject
  diagram.nodeTemplateMap.add("dataobject", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "File", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 70, height: 80 }),
    $(go.TextBlock, { font: "10px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(60, NaN), margin: 8, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // DataStore
  diagram.nodeTemplateMap.add("datastore", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Cylinder1", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 70, height: 70 }),
    $(go.TextBlock, { font: "10px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(60, NaN), margin: 8, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  // Annotation
  diagram.nodeTemplateMap.add("annotation", $(go.Node, "Spot",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { fill: "transparent", stroke: "#e76f51", strokeWidth: 1, width: 120, height: 60 }),
    $(go.TextBlock, { font: "10px Manrope, sans-serif", stroke: "#e76f51", maxSize: new go.Size(110, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay())
  ));

  // Link
  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 5, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.Shape, { toArrow: "Standard", fill: "#264653", stroke: null }),
    $(go.TextBlock, { font: "9px Manrope, sans-serif", stroke: "#264653", segmentOffset: new go.Point(0, -10), editable: true },
      new go.Binding("text").makeTwoWay())
  );
}

// === DFD ===
export function setupDFDDiagram(diagram, $) {
  diagram.nodeTemplateMap.add("process", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Ellipse", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 80, height: 80 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(70, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("store", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Cylinder1", { fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, width: 100, height: 70 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(90, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("external", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { fill: "#ffffff", stroke: "#e76f51", strokeWidth: 2, width: 100, height: 60 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(90, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 5, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.Shape, { toArrow: "Standard", fill: "#264653", stroke: null }),
    $(go.TextBlock, { font: "9px Manrope, sans-serif", stroke: "#264653", segmentOffset: new go.Point(0, -10), editable: true },
      new go.Binding("text").makeTwoWay())
  );
}

// === ERD ===
export function setupERDDiagram(diagram, $) {
  diagram.nodeTemplateMap.add("entity", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Rectangle", { fill: "#ffffff", stroke: "#2a9d8f", strokeWidth: 2, width: 120, height: 80 }),
    $(go.Panel, "Vertical",
      $(go.TextBlock, { font: "bold 12px Manrope, sans-serif", stroke: "#264653", margin: 8, editable: true },
        new go.Binding("text").makeTwoWay()),
      $(go.Shape, "LineH", { stroke: "#2a9d8f", strokeWidth: 1, height: 0, stretch: go.GraphObject.Horizontal }),
      $(go.TextBlock, "Attributes", { font: "10px Manrope, sans-serif", stroke: "#6c757d", margin: 4 })
    ),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("attribute", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Ellipse", { fill: "#ffffff", stroke: "#e9c46a", strokeWidth: 2, width: 80, height: 50 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(70, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.nodeTemplateMap.add("relationship", $(go.Node, "Auto",
    { locationSpot: go.Spot.Center },
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, "Diamond", { fill: "#ffffff", stroke: "#e76f51", strokeWidth: 2, width: 80, height: 80 }),
    $(go.TextBlock, { font: "11px Manrope, sans-serif", stroke: "#264653", maxSize: new go.Size(70, NaN), margin: 4, editable: true },
      new go.Binding("text").makeTwoWay()),
    makePort("T", go.Spot.Top, $), makePort("L", go.Spot.Left, $),
    makePort("R", go.Spot.Right, $), makePort("B", go.Spot.Bottom, $)
  ));

  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 5, relinkableFrom: true, relinkableTo: true },
    $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
    $(go.TextBlock, { font: "9px Manrope, sans-serif", stroke: "#264653", segmentOffset: new go.Point(0, -10), editable: true },
      new go.Binding("text").makeTwoWay())
  );
}