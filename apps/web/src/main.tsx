import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Mount the application inside React StrictMode to surface development-time lifecycle issues.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
