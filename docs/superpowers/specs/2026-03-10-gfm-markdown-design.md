# GFM Markdown Support Design

## Overview
Enhance markdown rendering to fully support GitHub Flavored Markdown (GFM) with lazy-loaded heavy features.

## Architecture

### Component Structure
```
frontend/src/shared/components/
├── GFMMarkdown/
│   ├── index.ts
│   ├── GFMMarkdown.tsx        # Main component
│   ├── plugins/
│   │   ├── mermaid.tsx        # Lazy-loaded Mermaid renderer
│   │   └── math.tsx           # Lazy-loaded KaTeX renderer
│   └── styles/
│       └── github-markdown.css # GitHub-like styling
```

### Dependencies
```json
{
  "remark-gfm": "^4.0.0",           // Tables, strikethrough, task lists, autolinks, footnotes
  "rehype-highlight": "^7.0.0",     // Syntax highlighting
  "highlight.js": "^11.9.0",        // Language definitions
  "mermaid": "^10.9.0",             // Diagrams (lazy loaded)
  "remark-math": "^6.0.0",          // Math syntax parsing
  "rehype-katex": "^7.0.0",         // Math rendering (lazy loaded)
  "katex": "^0.16.0"                // KaTeX library
}
```

### Loading Strategy
| Feature | Load Strategy | Size |
|---------|--------------|------|
| GFM (tables, strikethrough, etc.) | Eager | ~15KB |
| Syntax highlighting | Eager | ~35KB |
| Mermaid diagrams | Lazy (on ```mermaid detected) | ~1.5MB |
| KaTeX math | Lazy (on $...$ or $$...$$ detected) | ~300KB |

## Component API

```tsx
import { GFMMarkdown } from '@/shared/components';

// Basic usage - all features enabled, heavy ones lazy-loaded
<GFMMarkdown>{content}</GFMMarkdown>

// With custom className
<GFMMarkdown className="prose-sm">{content}</GFMMarkdown>
```

## Implementation Details

### GFMMarkdown.tsx
- Uses `react-markdown` with `remark-gfm` plugin
- Adds `rehype-highlight` for code blocks
- Custom components for:
  - `code`: Detects `mermaid` language, renders lazy Mermaid component
  - `span.math`: Detects math expressions, renders lazy KaTeX component
- GitHub-style CSS for consistent look

### Lazy Loading Pattern
```tsx
const MermaidRenderer = lazy(() => import('./plugins/mermaid'));

// In custom code component:
if (language === 'mermaid') {
  return (
    <Suspense fallback={<div>Loading diagram...</div>}>
      <MermaidRenderer code={children} />
    </Suspense>
  );
}
```

### GitHub Alerts/Admonitions
Support GitHub-style alerts:
```markdown
> [!NOTE]
> This is a note

> [!WARNING]
> This is a warning
```

Rendered with appropriate styling (blue for note, yellow for warning, etc.)

## Migration

Replace all `react-markdown` imports:
```tsx
// Before
import Markdown from 'react-markdown';
<Markdown>{content}</Markdown>

// After
import { GFMMarkdown } from '@/shared/components';
<GFMMarkdown>{content}</GFMMarkdown>
```

Affected files:
- `ChatPanel.tsx`
- `ReviewList.tsx`
- `PRDescription.tsx`
- `CommentList.tsx`

## Testing
- Render tables, task lists, strikethrough correctly
- Code blocks have syntax highlighting
- Mermaid diagrams render (verify lazy load)
- Math expressions render (verify lazy load)
- GitHub alerts styled correctly
