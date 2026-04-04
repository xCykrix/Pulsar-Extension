/** @jsxImportSource react */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import './style.css';

const rootElement = globalThis.document.getElementById('root');

if (!rootElement) {
  throw new Error('Root Element Unavailable');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
