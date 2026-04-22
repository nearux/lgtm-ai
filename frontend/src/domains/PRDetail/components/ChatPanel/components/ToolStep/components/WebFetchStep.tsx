import { Globe } from 'lucide-react';
import { ToolStep, type ChainPosition, type ToolStepStatus } from '../ToolStep';

interface Props {
  url: string;
  hostname: string;
  status: ToolStepStatus;
  chainPosition: ChainPosition;
}

export const WebFetchStep = ({
  url,
  hostname,
  status,
  chainPosition,
}: Props) => {
  return (
    <ToolStep
      status={status}
      icon={Globe}
      chainPosition={chainPosition}
      toolName="WebFetch"
      summary={
        <span title={url} className="font-mono text-xs">
          {hostname}
        </span>
      }
    />
  );
};
