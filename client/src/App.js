import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import the working UI component
import GenerativeDialogue from './components/GenerativeDialogue';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<GenerativeDialogue />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;