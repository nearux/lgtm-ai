import { lazy, Suspense, type ComponentProps, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

const MermaidRenderer = lazy(() => import('./plugins/MermaidRenderer'));

type MarkdownProps = ComponentProps<typeof ReactMarkdown>;

interface Props {
  children: string;
  className?: string;
  components?: MarkdownProps['components'];
}

const mergeClasses = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(' ');

const ALERT_TYPES = {
  NOTE: { icon: 'ℹ️', className: 'border-blue-300 bg-blue-50 text-blue-900' },
  TIP: { icon: '💡', className: 'border-green-300 bg-green-50 text-green-900' },
  IMPORTANT: {
    icon: '❗',
    className: 'border-purple-300 bg-purple-50 text-purple-900',
  },
  WARNING: {
    icon: '⚠️',
    className: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  },
  CAUTION: { icon: '🔴', className: 'border-red-300 bg-red-50 text-red-900' },
} as const;

type AlertType = keyof typeof ALERT_TYPES;

const parseGitHubAlert = (
  children: ReactNode
): { type: AlertType; content: ReactNode } | null => {
  if (!Array.isArray(children)) return null;

  const firstChild = children[0];
  if (typeof firstChild !== 'string') return null;

  const match = firstChild.match(
    /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n?/
  );
  if (!match) return null;

  const type = match[1] as AlertType;
  const restOfFirst = firstChild.slice(match[0].length);
  const content = restOfFirst
    ? [restOfFirst, ...children.slice(1)]
    : children.slice(1);

  return { type, content };
};

export const GFMMarkdown = ({ children, className, components }: Props) => {
  return (
    <div className={mergeClasses('prose prose-gray max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
        components={{
          code({ className: codeClassName, children: codeChildren, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match?.[1];

            // Handle Mermaid diagrams (before rehype-highlight processes it)
            if (language === 'mermaid') {
              const code = String(codeChildren).replace(/\n$/, '');
              return (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Loading diagram...
                    </div>
                  }
                >
                  <MermaidRenderer code={code} />
                </Suspense>
              );
            }

            // Inline code - no hljs class means it's inline
            const isInline = !codeClassName?.includes('hljs');
            if (isInline) {
              return (
                <code
                  className="not-prose rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800"
                  {...props}
                >
                  {codeChildren}
                </code>
              );
            }

            // Code block - let rehype-highlight handle syntax colors
            return (
              <code className={codeClassName} {...props}>
                {codeChildren}
              </code>
            );
          },
          // GitHub-style alerts in blockquotes
          blockquote({ children: blockChildren }) {
            const alert = parseGitHubAlert(blockChildren);

            if (alert) {
              const { icon, className: alertClassName } =
                ALERT_TYPES[alert.type];
              return (
                <div
                  className={mergeClasses(
                    'my-4 rounded-lg border-l-4 p-4',
                    alertClassName
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <span>{icon}</span>
                    <span>{alert.type}</span>
                  </div>
                  <div className="[&>p]:m-0">{alert.content}</div>
                </div>
              );
            }

            return (
              <blockquote className="border-l-4 border-gray-300 pl-4 text-gray-600 italic">
                {blockChildren}
              </blockquote>
            );
          },
          // Task list checkboxes
          input({ type, checked, ...props }) {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled
                  className="mr-2 h-4 w-4 rounded border-gray-300"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          // Tables with better styling
          table({ children: tableChildren }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  {tableChildren}
                </table>
              </div>
            );
          },
          th({ children: thChildren, style, ...props }) {
            return (
              <th
                className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900"
                style={style}
                {...props}
              >
                {thChildren}
              </th>
            );
          },
          td({ children: tdChildren, style, ...props }) {
            return (
              <td
                className="border-t border-gray-200 px-4 py-2 text-sm text-gray-700"
                style={style}
                {...props}
              >
                {tdChildren}
              </td>
            );
          },
          // Override prose pre styles
          pre({ children: preChildren }) {
            return (
              <pre className="not-prose my-4 overflow-x-auto rounded-lg text-sm leading-relaxed">
                {preChildren}
              </pre>
            );
          },
          // Collapsible details/summary
          details({ children: detailsChildren, ...props }) {
            return (
              <details
                className="my-4 rounded-lg border border-gray-200 bg-gray-50"
                {...props}
              >
                {detailsChildren}
              </details>
            );
          },
          summary({ children: summaryChildren, ...props }) {
            return (
              <summary
                className="cursor-pointer px-4 py-2 font-medium text-gray-900 hover:bg-gray-100"
                {...props}
              >
                {summaryChildren}
              </summary>
            );
          },
          ...components,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
