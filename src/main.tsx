import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore } from './engine/store'
import './styles.css'

// Console/e2e debug handle: `__seymour.getState()` in devtools.
;(window as unknown as Record<string, unknown>).__seymour = useStore

createRoot(document.getElementById('root')!).render(<App />)
