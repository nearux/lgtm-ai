import { FileText } from 'lucide-react';
import { ToolStep, type ChainPosition, type ToolStepStatus } from '../ToolStep';

interface Props {
  filePath: string;
  fileName: string;
  status: ToolStepStatus;
  chainPosition: ChainPosition;
}

export const ReadStep = ({
  filePath,
  fileName,
  status,
  chainPosition,
}: Props) => {
  return (
    <ToolStep
      status={status}
      icon={FileText}
      chainPosition={chainPosition}
      toolName="Read"
      summary={
        <span title={filePath} className="font-mono text-xs">
          {fileName}
        </span>
      }
    />
  );
};
