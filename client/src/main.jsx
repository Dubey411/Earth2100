import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import './index.css'
import App from './App.jsx'

// Expose THREE globally to ensure react-globe.gl and three-globe use the same instance and resolve instanceof checks correctly
window.THREE = THREE

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
