import React from 'react';
import CustomDiagram from './components/CustomDiagram';
import './App.css';
import { Diagram } from 'gojs';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React + Vite с GoJS</h1>
      </header>
      <CustomDiagram />
    </div>
  );
}

export default App;