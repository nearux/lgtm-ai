// backend/services/chatSessions.ts
// Compatibility shim for code not yet migrated (ClaudeSessionManager, etc.).
// Delegates to the DI-managed ChatSessionsService. Remove this file once all
// consumers are migrated to inject ChatSessionsService directly.
import { container } from '../container.js';
import { ChatSessionsService } from '../modules/projects/chat-sessions.service.js';
import type {
  ChatSessionSummary,
  ClaudeChatContext,
} from '../types/chatSessions.js';

// NOTE: Get the service per-call, not at module load, to avoid container-load
// ordering issues during test setup with vi.resetModules().
const getService = () => container.get(ChatSessionsService);

export const createChatSessionFromExecution = (
  context: ClaudeChatContext,
  claudeSessionId: string,
  commandMeta?: { command?: string; customPrompt?: string }
): Promise<ChatSessionSummary> =>
  getService().createChatSessionFromExecution(
    context,
    claudeSessionId,
    commandMeta
  );

export const markChatSessionAsUsed = (claudeSessionId: string): Promise<void> =>
  getService().markChatSessionAsUsed(claudeSessionId);
