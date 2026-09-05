import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useRobotStore } from './state/robotStore'

// Expose robot store in dev mode for testing and debugging
if (import.meta.env.DEV) {
  (window as unknown as { __ROBOT_STORE__: typeof useRobotStore }).__ROBOT_STORE__ = useRobotStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

