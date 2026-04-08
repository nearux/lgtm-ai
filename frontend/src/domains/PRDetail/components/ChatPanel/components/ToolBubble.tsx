import { motion } from 'motion/react';
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  Check,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { GroupedItem } from '../utils/groupMessages';

interface Props {
  item: GroupedItem & { kind: 'tool' };
  isExpanded: boolean;
  onToggle: () => void;
}

export const ToolBubble = ({ item, isExpanded, onToggle }: Props) => {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-lg border border-purple-200 bg-purple-50"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-purple-100"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-purple-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-purple-500" />
        )}
        <Terminal className="h-4 w-4 text-purple-600" />
        <span className="font-medium text-purple-800">{item.toolName}</span>
        <span className="ml-auto">
          {item.result === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          ) : item.isError ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-purple-200 bg-purple-100/50 p-2">
          <div className="mb-1 text-xs font-medium text-purple-600">Input:</div>
          <pre className="max-h-24 overflow-auto text-xs whitespace-pre-wrap text-purple-900">
            {item.input}
          </pre>
          {item.result !== undefined && (
            <>
              <div className="mt-2 mb-1 text-xs font-medium text-purple-600">
                Result:
              </div>
              <pre
                className={`max-h-32 overflow-auto text-xs whitespace-pre-wrap ${
                  item.isError ? 'text-red-700' : 'text-purple-900'
                }`}
              >
                {item.result.slice(0, 500)}
                {item.result.length > 500 && '...'}
              </pre>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};
