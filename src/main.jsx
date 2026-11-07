import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';
import App from './App';import {AppProvider} from './store';import './styles.css';import './video.css';import './slim.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><AppProvider><App/></AppProvider></BrowserRouter>);
