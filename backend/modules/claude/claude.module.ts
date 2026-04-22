import { ContainerModule } from 'inversify';
import { ClaudeSessionHistoryService } from './claude-session-history.service.js';
import { ClaudeWSController } from './claude-ws.controller.js';

export const claudeModule = new ContainerModule((options) => {
  options.bind(ClaudeSessionHistoryService).toSelf();
  options.bind(ClaudeWSController).toSelf();
});
