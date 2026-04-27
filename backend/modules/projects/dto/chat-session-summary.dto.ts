import type { ChatSession } from '@prisma/client';
import type {
  ChatSessionScopeType,
  ChatSessionSummary,
  ChatSessionTargetType,
} from '../chat-session.types.js';

export class ChatSessionSummaryDto implements ChatSessionSummary {
  id: string;
  projectId: string;
  targetType: ChatSessionTargetType;
  targetNumber: number;
  scopeType: ChatSessionScopeType;
  scopeTargetId: string;
  claudeSessionId: string;
  title?: string;
  command?: string;
  customPrompt?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;

  constructor(data: ChatSessionSummary) {
    this.id = data.id;
    this.projectId = data.projectId;
    this.targetType = data.targetType;
    this.targetNumber = data.targetNumber;
    this.scopeType = data.scopeType;
    this.scopeTargetId = data.scopeTargetId;
    this.claudeSessionId = data.claudeSessionId;
    this.title = data.title;
    this.command = data.command;
    this.customPrompt = data.customPrompt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastUsedAt = data.lastUsedAt;
  }

  static fromModel(this: void, model: ChatSession): ChatSessionSummaryDto {
    return new ChatSessionSummaryDto({
      id: model.id,
      projectId: model.project_id,
      targetType: model.target_type,
      targetNumber: model.target_number,
      scopeType: model.scope_type,
      scopeTargetId: model.scope_target_id,
      claudeSessionId: model.claude_session_id,
      ...(model.title ? { title: model.title } : {}),
      ...(model.command ? { command: model.command } : {}),
      ...(model.custom_prompt ? { customPrompt: model.custom_prompt } : {}),
      createdAt: model.created_at.toISOString(),
      updatedAt: model.updated_at.toISOString(),
      lastUsedAt: model.last_used_at.toISOString(),
    });
  }
}
