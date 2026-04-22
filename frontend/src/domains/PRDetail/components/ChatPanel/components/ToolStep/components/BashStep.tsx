import { useState } from 'react';
import { Check, Copy, Loader2, Terminal } from 'lucide-react';
import { ToolStep, type ChainPosition, type ToolStepStatus } from '../ToolStep';

interface Props {
  command: string;
  description: string | undefined;
  result: string | undefined;
  isRunning: boolean;
  stderrChunks: string[] | undefined;
  status: ToolStepStatus;
  chainPosition: ChainPosition;
  isExpanded: boolean;
  onToggle: () => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="absolute top-1 right-1 rounded p-1 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700"
      aria-label="Copy"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

const Box = ({
  label,
  content,
  maxHeight,
  muted,
  loading,
}: {
  label: string;
  content: string;
  maxHeight: string;
  muted?: boolean;
  loading?: boolean;
}) => (
  <div className="group relative overflow-hidden rounded bg-gray-100">
    <div className="flex items-start">
      <div className="flex-none px-2 py-1 text-[10px] font-semibold tracking-wide text-gray-400">
        {label}
      </div>
      {loading ? (
        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      ) : (
        <pre
          className={`min-w-0 flex-1 overflow-auto px-2 py-1 font-mono text-xs whitespace-pre ${
            muted ? 'text-gray-500' : 'text-gray-800'
          } ${maxHeight}`}
        >
          {content}
        </pre>
      )}
    </div>
    {!loading && <CopyButton text={content} />}
  </div>
);

export const BashStep = ({
  command,
  description,
  result,
  isRunning,
  stderrChunks,
  status,
  chainPosition,
  isExpanded,
  onToggle,
}: Props) => {
  const summary = description ? (
    <span>{description}</span>
  ) : (
    <span className="font-mono text-xs">{command.slice(0, 80)}</span>
  );

  const outContent = isRunning ? (stderrChunks ?? []).join('') : (result ?? '');
  const outMaxHeight = isExpanded ? 'max-h-none' : 'max-h-24';

  const body = (
    <>
      <Box
        label="IN"
        content={command}
        maxHeight={isExpanded ? 'max-h-none' : 'max-h-16'}
      />
      <Box
        label="OUT"
        content={outContent}
        maxHeight={outMaxHeight}
        muted={isRunning}
        loading={isRunning && !outContent}
      />
    </>
  );

  return (
    <ToolStep
      status={status}
      icon={Terminal}
      chainPosition={chainPosition}
      toolName="Bash"
      summary={summary}
      expandable={{
        isExpanded,
        onToggle,
        expandedBody: null,
      }}
      body={body}
    />
  );
};
