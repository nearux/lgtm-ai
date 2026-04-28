import type {
  ChatSessionHistoryEntry,
  ChatSessionHistoryResponse,
} from '../../claude/session-history.types.js';

export class ChatSessionHistoryResponseDto implements ChatSessionHistoryResponse {
  sessionId: string;
  claudeSessionId: string;
  entries: ChatSessionHistoryEntry[];

  constructor(data: ChatSessionHistoryResponse) {
    this.sessionId = data.sessionId;
    this.claudeSessionId = data.claudeSessionId;
    this.entries = data.entries;
  }

  static of(
    sessionId: string,
    claudeSessionId: string,
    entries: ChatSessionHistoryEntry[]
  ): ChatSessionHistoryResponseDto {
    return new ChatSessionHistoryResponseDto({
      sessionId,
      claudeSessionId,
      entries,
    });
  }
}
