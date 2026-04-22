import { Wrench } from 'lucide-react';
import { ToolStep, type ChainPosition, type ToolStepStatus } from '../ToolStep';

interface Props {
  toolName: string;
  status: ToolStepStatus;
  chainPosition: ChainPosition;
}

export const GenericStep = ({ toolName, status, chainPosition }: Props) => {
  return (
    <ToolStep
      status={status}
      icon={Wrench}
      chainPosition={chainPosition}
      toolName={toolName}
      summary={null}
    />
  );
};
