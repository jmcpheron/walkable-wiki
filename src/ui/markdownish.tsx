import type { ReactNode } from 'react'

// Shared inline formatter for the manifests' markdown-ish text: **bold** only.
// Used by wiki panels and loading-screen tips alike.
export function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  )
}
