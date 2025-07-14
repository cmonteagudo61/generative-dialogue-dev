import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';
// Debug logger disabled
// import DebugLogger from './utils/debugLogger';

// Initialize debug logger and override console logs
// if (process.env.NODE_ENV === 'development') {
//   console.log('Debug mode enabled');
//   // Override console methods to also display in UI logger
//   DebugLogger.overrideConsole();
//   window.debugLogger = DebugLogger;
// }

const root = createRoot(document.getElementById('root'));
// Remove StrictMode for production to prevent duplicate API calls
root.render(<App />);

