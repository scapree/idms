// src/components/NodeActionButtons.jsx
import * as go from 'gojs';

// Добавить новый атрибут к сущности
const addAttribute = (e, button) => {
  const node = button.part.adornedPart;
  e.diagram.startTransaction("addAttribute");
  const newAttribute = { name: "NewAttribute", iskey: false, isfk: false };
  e.diagram.model.addArrayItem(node.data.items, newAttribute);
  e.diagram.commitTransaction("addAttribute");
};

// *** ИСПРАВЛЕНИЕ: Полностью переписанная и рабочая логика удаления атрибута ***
const deleteAttribute = (e, button) => {
  // `button.part` - это панель, представляющая строку атрибута
  const attributePanel = button.part; 
  // `attributePanel.part` - это главный узел (сущность), к которому принадлежит эта панель
  const entityNode = attributePanel.part;

  if (entityNode) {
    e.diagram.startTransaction("deleteAttribute");
    // `attributePanel.data` - это объект данных для этого конкретного атрибута
    const attributeData = attributePanel.data;
    // `entityNode.data.items` - это массив всех атрибутов сущности
    const itemsArray = entityNode.data.items;
    
    const index = itemsArray.indexOf(attributeData);
    if (index > -1) {
      // Используем модель диаграммы для безопасного удаления элемента из массива
      e.diagram.model.removeArrayItem(itemsArray, index);
    }
    e.diagram.commitTransaction("deleteAttribute");
  }
};

const makeButton = ($, text, action, visiblePredicate) => {
  return $("Button", { margin: 2, click: action, visible: !!visiblePredicate },
    $(go.TextBlock, text, { font: "10px Manrope", stroke: "#264653" })
  );
};

// Создает шаблон для МЕНЮ ВЫДЕЛЕНИЯ сущности
export function createEntityAdornment($) {
  return $(go.Adornment, "Spot",
    $(go.Placeholder),
    $(go.Panel, "Horizontal",
      { alignment: go.Spot.Top, alignmentFocus: go.Spot.Bottom, margin: 4 },
      makeButton($, "Add Attribute", addAttribute, true)
    )
  );
}

// Создает шаблон для ОДНОГО АТРИБУТА в списке
export function createAttributeItemTemplate($) {
  return $(go.Panel, "Horizontal", 
    { 
      // Добавляем фон, чтобы было легче навести мышь
      background: "transparent",
      mouseEnter: (e, panel) => panel.background = "rgba(0,0,0,0.05)",
      mouseLeave: (e, panel) => panel.background = "transparent",
    },
    { margin: new go.Margin(2, 0, 2, 0) },
    $(go.Panel, "Horizontal", { width: 32 },
      $(go.TextBlock, { font: "bold 11px Manrope", stroke: "#e9c46a", text: "PK", visible: false, margin: 2 },
        new go.Binding("visible", "iskey")),
      $(go.TextBlock, { font: "bold 11px Manrope", stroke: "#2a9d8f", text: "FK", visible: false, margin: 2 },
        new go.Binding("visible", "isfk"))
    ),
    $(go.TextBlock, { font: "12px Manrope", stroke: "#264653", editable: true, margin: new go.Margin(2, 4) },
      new go.Binding("text", "name").makeTwoWay()),
    $("Button",
      {
        alignment: go.Spot.Right,
        margin: new go.Margin(0, 4, 0, 10),
        click: deleteAttribute,
        opacity: 0, // Кнопка по умолчанию невидима
        mouseEnter: (e, button) => button.opacity = 1,
        mouseLeave: (e, button) => button.opacity = 0
      },
      $(go.TextBlock, "✕", { font: "bold 10px sans-serif", stroke: "#e76f51" })
    )
  );
}