import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useRobotStore } from './state/robotStore'

// Expose robot store in dev mode or localhost for testing and debugging
if (import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
  (window as unknown as { __ROBOT_STORE__: typeof useRobotStore }).__ROBOT_STORE__ = useRobotStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

