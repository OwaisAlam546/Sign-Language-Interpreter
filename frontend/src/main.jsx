import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SmoothScroll from './components/SmoothScroll.jsx';
import 'lenis/dist/lenis.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SmoothScroll>
      <App />
    </SmoothScroll>
  </React.StrictMode>
);
