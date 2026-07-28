import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore } from './engine/store'
import { initialSceneFromHash } from './engine/router'
import './styles.css'

// Resolve the deep link before first render so a shared #/loc/<slug> URL
// spawns you inside that location instead of flashing the street first.
useStore.setState(initialSceneFromHash())

// Console/e2e debug handle: `__seymour.getState()` in devtools.
;(window as unknown as Record<string, unknown>).__seymour = useStore

createRoot(document.getElementById('root')!).render(<App />)
