import { Pencil } from 'lucide-react';
import { ToolStep, type ChainPosition, type ToolStepStatus } from '../ToolStep';

interface Props {
  filePath: string;
  fileName: string;
  status: ToolStepStatus;
  chainPosition: ChainPosition;
}

export const EditStep = ({
  filePath,
  fileName,
  status,
  chainPosition,
}: Props) => {
  return (
    <ToolStep
      status={status}
      icon={Pencil}
      chainPosition={chainPosition}
      toolName="Edit"
      summary={
        <span title={filePath} className="font-mono text-xs">
          {fileName}
        </span>
      }
    />
  );
};
