import type { ChatSession } from '@prisma/client';
import type { ChatSessionSummary } from '../types/chatSessions.js';

export class ChatSessionSummaryDto implements ChatSessionSummary {
  id: string;
  projectId: string;
  prNumber: number;
  scopeType: 'REVIEW' | 'COMMENT';
  scopeTargetId: string;
  claudeSessionId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;

  constructor(data: ChatSessionSummary) {
    this.id = data.id;
    this.projectId = data.projectId;
    this.prNumber = data.prNumber;
    this.scopeType = data.scopeType;
    this.scopeTargetId = data.scopeTargetId;
    this.claudeSessionId = data.claudeSessionId;
    this.title = data.title;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastUsedAt = data.lastUsedAt;
  }

  static fromModel(model: ChatSession): ChatSessionSummaryDto {
    return new ChatSessionSummaryDto({
      id: model.id,
      projectId: model.project_id,
      prNumber: model.pr_number,
      scopeType: model.scope_type,
      scopeTargetId: model.scope_target_id,
      claudeSessionId: model.claude_session_id,
      ...(model.title ? { title: model.title } : {}),
      createdAt: model.created_at.toISOString(),
      updatedAt: model.updated_at.toISOString(),
      lastUsedAt: model.last_used_at.toISOString(),
    });
  }
}
