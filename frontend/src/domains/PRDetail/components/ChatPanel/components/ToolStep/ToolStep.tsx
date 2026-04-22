import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

export type ToolStepStatus = 'running' | 'success' | 'error' | 'warning';
export type ChainPosition = 'start' | 'middle' | 'end' | 'single';

interface ExpandableProps {
  isExpanded: boolean;
  onToggle: () => void;
  expandedBody: ReactNode;
}

interface Props {
  status: ToolStepStatus;
  icon: LucideIcon;
  chainPosition: ChainPosition;
  toolName: string;
  summary: ReactNode;
  body?: ReactNode;
  expandable?: ExpandableProps;
}

const DOT_COLOR: Record<ToolStepStatus, string> = {
  running: 'bg-gray-400',
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

export const ToolStep = ({
  status,
  icon: Icon,
  chainPosition,
  toolName,
  summary,
  body,
  expandable,
}: Props) => {
  const showConnectorAbove =
    chainPosition === 'middle' || chainPosition === 'end';
  const showConnectorBelow =
    chainPosition === 'middle' || chainPosition === 'start';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex gap-3"
    >
      <div className="relative flex w-5 flex-none flex-col items-center">
        {showConnectorAbove && (
          <div className="absolute top-0 bottom-1/2 w-px -translate-y-3 bg-gray-200" />
        )}
        <div
          className={`relative z-10 mt-2 h-2 w-2 rounded-full ${DOT_COLOR[status]} ${
            status === 'running' ? 'animate-pulse' : ''
          }`}
          aria-label={status}
        />
        {showConnectorBelow && (
          <div className="absolute top-1/2 bottom-0 w-px translate-y-3 bg-gray-200" />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div
          className={`flex items-center gap-2 text-sm ${
            expandable ? 'cursor-pointer hover:text-gray-900' : 'cursor-default'
          }`}
          onClick={expandable?.onToggle}
          role={expandable ? 'button' : undefined}
          tabIndex={expandable ? 0 : undefined}
          onKeyDown={(e) => {
            if (expandable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              expandable.onToggle();
            }
          }}
        >
          {expandable &&
            (expandable.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 flex-none text-gray-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 flex-none text-gray-400" />
            ))}
          <Icon className="h-4 w-4 flex-none text-gray-500" />
          <span className="font-semibold text-gray-800">{toolName}</span>
          <span className="min-w-0 flex-1 truncate text-gray-600">
            {summary}
          </span>
        </div>
        {body && <div className="mt-2 space-y-1.5">{body}</div>}
        {expandable?.isExpanded && (
          <div className="mt-2 space-y-1.5">{expandable.expandedBody}</div>
        )}
      </div>
    </motion.div>
  );
};
