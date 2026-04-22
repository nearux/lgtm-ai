import { Search } from 'lucide-react';
import { ToolStep, type ChainPosition, type ToolStepStatus } from '../ToolStep';

interface Props {
  pattern: string;
  path: string | undefined;
  glob: string | undefined;
  result: string | undefined;
  status: ToolStepStatus;
  chainPosition: ChainPosition;
  isExpanded: boolean;
  onToggle: () => void;
}

const lineCount = (s: string): number => s.split('\n').filter(Boolean).length;

export const GrepStep = ({
  pattern,
  path,
  glob,
  result,
  status,
  chainPosition,
  isExpanded,
  onToggle,
}: Props) => {
  const scope = path ?? glob;
  const summary = (
    <span className="font-mono text-xs">
      <span className="text-gray-900">&quot;{pattern}&quot;</span>
      {scope && <span className="text-gray-500"> in {scope}</span>}
      {result !== undefined && (
        <span className="ml-2 text-gray-400">
          {lineCount(result)} lines of output
        </span>
      )}
    </span>
  );

  return (
    <ToolStep
      status={status}
      icon={Search}
      chainPosition={chainPosition}
      toolName="Grep"
      summary={summary}
      expandable={{
        isExpanded,
        onToggle,
        expandedBody: (
          <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-2 font-mono text-xs whitespace-pre-wrap text-gray-800">
            {result ?? ''}
          </pre>
        ),
      }}
    />
  );
};
