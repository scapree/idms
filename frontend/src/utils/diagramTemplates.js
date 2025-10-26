import * as go from 'gojs';

// Helper function to create ports
export function makePort(name, spot, $) {
  return $(go.Shape, "Circle", {
    fill: "transparent",
    strokeWidth: 0,
    width: 8,
    height: 8,
    alignment: spot,
    portId: name,
    fromSpot: spot,
    fromLinkable: true,
    toSpot: spot,
    toLinkable: true,
    cursor: "pointer",
    mouseEnter: (e, port) => {
      if (!e.diagram.isReadOnly) port.fill = "#2a9d8f";
    },
    mouseLeave: (e, port) => {
      port.fill = "transparent";
    }
  });
}

// === BPMN SETUP ===
export function setupBPMNDiagram(diagram, $) {
  // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
  // Определяем фигуру "File" вручную, так как она не является стандартной в GoJS.
  // Это устранит ошибку "Unknown Shape.figure".
  // 1. Определение фигуры "File"
  go.Shape.defineFigureGenerator("File", (shape, w, h) => {
    const geo = new go.Geometry();
    const fig = new go.PathFigure(0, 0, true);
    geo.add(fig);
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.2));
    fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.8, 0));
    fig.add(new go.PathSegment(go.PathSegment.Close));
    const fig2 = new go.PathFigure(w * 0.8, 0, false);
    geo.add(fig2);
    fig2.add(new go.PathSegment(go.PathSegment.Line, w * 0.8, h * 0.2));
    fig2.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.2));
    return geo;
  });

  // 2. Определение фигуры "Cylinder1" (НОВОЕ ИСПРАВЛЕНИЕ)
  go.Shape.defineFigureGenerator("Cylinder1", (shape, w, h) => {
    const geo = new go.Geometry();
    const c = 0.5; // controlling the curvature of the cylinder top
    const fig = new go.PathFigure(w, c * h, true);
    geo.add(fig);

    fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
    fig.add(new go.PathSegment(go.PathSegment.Bezier, 0, h, w, (2 - c) * h, 0, (2 - c) * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, c * h));
    fig.add(new go.PathSegment(go.PathSegment.Bezier, w, c * h, 0, (2 * c - 1) * h, w, (2 * c - 1) * h).close());
    return geo;
  });

  // Event template
  diagram.nodeTemplateMap.add("event",
    $(go.Node, "Spot",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Circle",
        {
          fill: "#ffffff",
          strokeWidth: 2,
          stroke: "#2a9d8f",
          width: 50,
          height: 50
        },
        new go.Binding("strokeWidth", "eventType", et => et === 2 ? 4 : 2)
      ),
      $(go.TextBlock,
        {
          font: "10px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(45, NaN)
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // Activity template
  diagram.nodeTemplateMap.add("activity",
    $(go.Node, "Spot",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle",
        {
          fill: "#ffffff",
          stroke: "#2a9d8f",
          strokeWidth: 2,
          parameter1: 10,
          width: 100,
          height: 60
        }
      ),
      $(go.TextBlock,
        {
          font: "11px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(90, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // Gateway template
  diagram.nodeTemplateMap.add("gateway",
    $(go.Node, "Spot",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Diamond",
        {
          fill: "#ffffff",
          stroke: "#e9c46a",
          strokeWidth: 2,
          width: 50,
          height: 50
        }
      ),
      $(go.TextBlock,
        {
          font: "20px bold",
          stroke: "#264653"
        },
        new go.Binding("text", "gatewayType", gt => {
          if (gt === 1) return "X";
          if (gt === 2) return "+";
          if (gt === 3) return "O";
          return "";
        })
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // Data Object template
  diagram.nodeTemplateMap.add("dataobject",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "File", // Теперь это имя будет работать
        {
          fill: "#ffffff",
          stroke: "#264653",
          strokeWidth: 1,
          width: 50,
          height: 60
        }
      ),
      $(go.TextBlock,
        {
          font: "9px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(40, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      )
    )
  );

  // Data Store template
  diagram.nodeTemplateMap.add("datastore",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Cylinder1",
        {
          fill: "#ffffff",
          stroke: "#264653",
          strokeWidth: 1,
          width: 60,
          height: 40
        }
      ),
      $(go.TextBlock,
        {
          font: "9px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(50, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      )
    )
  );

  // Annotation template
  diagram.nodeTemplateMap.add("annotation",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle",
        {
          fill: "#fffacd",
          stroke: "#e9c46a",
          strokeWidth: 1,
          parameter1: 5,
          width: 100,
          height: 60
        }
      ),
      $(go.TextBlock,
        {
          font: "10px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(90, NaN),
          margin: 5,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      )
    )
  );

  // BPMN link template
  diagram.linkTemplate =
    $(go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        relinkableFrom: true,
        relinkableTo: true
      },
      $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
      $(go.Shape, { toArrow: "Standard", stroke: null, fill: "#264653" })
    );
}

// === DFD SETUP ===
export function setupDFDDiagram(diagram, $) {
  // Process template
  diagram.nodeTemplateMap.add("process",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Circle",
        {
          fill: "#ffffff",
          stroke: "#2a9d8f",
          strokeWidth: 2,
          width: 80,
          height: 80
        }
      ),
      $(go.TextBlock,
        {
          font: "11px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(70, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // Data Store template
  diagram.nodeTemplateMap.add("store",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle",
        {
          fill: "#ffffff",
          stroke: "#e76f51",
          strokeWidth: 2,
          width: 100,
          height: 60
        }
      ),
      $(go.Shape, "LineH",
        {
          stroke: "#e76f51",
          strokeWidth: 2,
          height: 0,
          stretch: go.GraphObject.Horizontal,
          alignment: new go.Spot(0, 0, 0, 10)
        }
      ),
      $(go.TextBlock,
        {
          font: "11px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(90, NaN),
          margin: new go.Margin(15, 5, 5, 5),
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $)
    )
  );

  // External Entity template
  diagram.nodeTemplateMap.add("external",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle",
        {
          fill: "#ffffff",
          stroke: "#f4a261",
          strokeWidth: 2,
          width: 80,
          height: 60
        }
      ),
      $(go.TextBlock,
        {
          font: "11px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(70, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // DFD link template
  diagram.linkTemplate =
    $(go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        relinkableFrom: true,
        relinkableTo: true
      },
      $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
      $(go.Shape, { toArrow: "Standard", stroke: null, fill: "#264653" }),
      $(go.TextBlock,
        {
          font: "9px Manrope, sans-serif",
          stroke: "#264653",
          segmentOffset: new go.Point(0, -10),
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      )
    );
}

// === ERD SETUP ===
export function setupERDDiagram(diagram, $) {
  // Entity template
  diagram.nodeTemplateMap.add("entity",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle",
        {
          fill: "#ffffff",
          stroke: "#2a9d8f",
          strokeWidth: 2,
          width: 120,
          height: 80
        }
      ),
      $(go.Panel, "Vertical",
        $(go.TextBlock,
          {
            font: "bold 12px Manrope, sans-serif",
            stroke: "#264653",
            margin: 8,
            editable: true
          },
          new go.Binding("text").makeTwoWay()
        ),
        $(go.Shape, "LineH",
          {
            stroke: "#2a9d8f",
            strokeWidth: 1,
            height: 0,
            stretch: go.GraphObject.Horizontal
          }
        ),
        $(go.TextBlock, "Attributes",
          {
            font: "10px Manrope, sans-serif",
            stroke: "#6c757d",
            margin: 4
          }
        )
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // Attribute template
  diagram.nodeTemplateMap.add("attribute",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Ellipse",
        {
          fill: "#ffffff",
          stroke: "#e9c46a",
          strokeWidth: 2,
          width: 80,
          height: 50
        }
      ),
      $(go.TextBlock,
        {
          font: "11px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(70, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // Relationship template
  diagram.nodeTemplateMap.add("relationship",
    $(go.Node, "Auto",
      { locationSpot: go.Spot.Center },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Diamond",
        {
          fill: "#ffffff",
          stroke: "#e76f51",
          strokeWidth: 2,
          width: 80,
          height: 80
        }
      ),
      $(go.TextBlock,
        {
          font: "11px Manrope, sans-serif",
          stroke: "#264653",
          maxSize: new go.Size(70, NaN),
          margin: 4,
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      ),
      makePort("T", go.Spot.Top, $),
      makePort("L", go.Spot.Left, $),
      makePort("R", go.Spot.Right, $),
      makePort("B", go.Spot.Bottom, $)
    )
  );

  // ERD link template
  diagram.linkTemplate =
    $(go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        relinkableFrom: true,
        relinkableTo: true
      },
      $(go.Shape, { strokeWidth: 2, stroke: "#264653" }),
      $(go.TextBlock,
        {
          font: "9px Manrope, sans-serif",
          stroke: "#264653",
          segmentOffset: new go.Point(0, -10),
          editable: true
        },
        new go.Binding("text").makeTwoWay()
      )
    );
}