// First, so every animation library reads the (possibly slowed) clock
import './slowMotion.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'dialkit/styles.css';
import './style.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
