import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface Props {
  code: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  themeVariables: {
    background: '#ffffff',
    primaryTextColor: '#1f2937',
    secondaryTextColor: '#374151',
    lineColor: '#6b7280',
  },
});

let diagramId = 0;

const MermaidRenderer = ({ code }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;

      try {
        const id = `mermaid-${diagramId++}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to render diagram'
        );
        setSvg(null);
      }
    };

    render();
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded border border-red-200 bg-red-50 p-4">
        <div className="mb-2 font-semibold text-red-700">Mermaid Error</div>
        <pre className="text-sm whitespace-pre-wrap text-red-600">{error}</pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-red-500">
            Show source
          </summary>
          <pre className="mt-2 rounded bg-red-100 text-xs">{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto rounded-lg border border-gray-200 bg-white p-4"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
};

export default MermaidRenderer;
