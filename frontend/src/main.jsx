import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SmoothScroll from './components/SmoothScroll.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import 'lenis/dist/lenis.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SmoothScroll>
        <App />
      </SmoothScroll>
    </ThemeProvider>
  </React.StrictMode>
);
