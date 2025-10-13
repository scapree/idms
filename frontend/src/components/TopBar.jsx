import React from 'react';

function TopBar() {
  return (
    <header className="top-bar">
      <h1 className="top-bar-title">Diagram Editor</h1>
      <button className="action-button">Сохранить диаграмму</button>
      <button className="action-button">Сохранить проект</button>
    </header>
  );
}

export default TopBar;