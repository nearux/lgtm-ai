import { ContainerModule } from 'inversify';
import { ClaudeSessionHistoryService } from './claude-session-history.service.js';

export const claudeModule = new ContainerModule((options) => {
  options.bind(ClaudeSessionHistoryService).toSelf();
});
