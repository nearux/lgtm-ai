import type { GroupedItem } from '../utils/groupMessages';
import { parseToolInput } from './ToolStep/utils/parseToolInput';
import type { ToolStepStatus } from './ToolStep/ToolStep';
import { BashStep } from './ToolStep/components/BashStep';
import { ReadStep } from './ToolStep/components/ReadStep';
import { EditStep } from './ToolStep/components/EditStep';
import { WriteStep } from './ToolStep/components/WriteStep';
import { GrepStep } from './ToolStep/components/GrepStep';
import { WebFetchStep } from './ToolStep/components/WebFetchStep';
import { GenericStep } from './ToolStep/components/GenericStep';

interface Props {
  item: GroupedItem & { kind: 'tool' };
  isExpanded: boolean;
  onToggle: () => void;
}

const deriveStatus = (item: GroupedItem & { kind: 'tool' }): ToolStepStatus => {
  if (item.isRunning) return 'running';
  if (item.isError) return 'error';
  if (item.toolName === 'Bash' && (item.stderrChunks?.length ?? 0) > 0)
    return 'warning';
  return 'success';
};

export const ToolBubble = ({ item, isExpanded, onToggle }: Props) => {
  const status = deriveStatus(item);
  const parsed = parseToolInput(item.toolName, item.input);

  if (parsed.kind === 'bash') {
    return (
      <BashStep
        command={parsed.command}
        description={parsed.description}
        result={item.result}
        isRunning={item.isRunning}
        stderrChunks={item.stderrChunks}
        status={status}
        chainPosition={item.chainPosition}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
    );
  }
  if (parsed.kind === 'read') {
    return (
      <ReadStep
        filePath={parsed.filePath}
        fileName={parsed.fileName}
        status={status}
        chainPosition={item.chainPosition}
      />
    );
  }
  if (parsed.kind === 'edit') {
    return (
      <EditStep
        filePath={parsed.filePath}
        fileName={parsed.fileName}
        status={status}
        chainPosition={item.chainPosition}
      />
    );
  }
  if (parsed.kind === 'write') {
    return (
      <WriteStep
        filePath={parsed.filePath}
        fileName={parsed.fileName}
        status={status}
        chainPosition={item.chainPosition}
      />
    );
  }
  if (parsed.kind === 'grep') {
    return (
      <GrepStep
        pattern={parsed.pattern}
        path={parsed.path}
        glob={parsed.glob}
        result={item.result}
        status={status}
        chainPosition={item.chainPosition}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
    );
  }
  if (parsed.kind === 'webfetch') {
    return (
      <WebFetchStep
        url={parsed.url}
        hostname={parsed.hostname}
        status={status}
        chainPosition={item.chainPosition}
      />
    );
  }
  return (
    <GenericStep
      toolName={item.toolName}
      status={status}
      chainPosition={item.chainPosition}
    />
  );
};
