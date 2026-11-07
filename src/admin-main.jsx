import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import Admin,{AdminLogin,AdminRegister} from './Admin';import {AppProvider,useApp} from './store';import './styles.css';import './video.css';import './slim.css';
function AdminApp(){const {ready}=useApp();if(!ready)return null;
  return <Routes><Route path="/admin/login" element={<AdminLogin/>}/><Route path="/admin/register" element={<AdminRegister/>}/><Route path="/admin/*" element={<Admin/>}/><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes>;}
createRoot(document.getElementById('root')).render(<BrowserRouter><AppProvider><AdminApp/></AppProvider></BrowserRouter>);
