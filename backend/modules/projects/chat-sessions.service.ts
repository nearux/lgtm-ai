import HttpStatus from 'http-status';
import { randomUUID } from 'node:crypto';
import { inject, injectable } from 'inversify';
import { AppError } from '../../errors/AppError.js';
import { ClaudeSessionHistoryService } from '../claude/claude-session-history.service.js';
import { ChatSessionHistoryResponseDto } from './dto/chat-session-history-response.dto.js';
import { ChatSessionSummaryDto } from './dto/chat-session-summary.dto.js';
import { ChatSessionRepository } from './chat-session.repository.js';
import { ProjectRepository } from './project.repository.js';
import type {
  ChatSessionHistoryResponse,
  ChatSessionSummary,
  ChatSessionTargetType,
  ClaudeChatContext,
  ListChatSessionsFilters,
} from '../../types/chatSessions.js';

@injectable()
export class ChatSessionsService {
  constructor(
    @inject(ChatSessionRepository)
    private readonly chatSessionRepository: ChatSessionRepository,
    @inject(ProjectRepository)
    private readonly projectRepository: ProjectRepository,
    @inject(ClaudeSessionHistoryService)
    private readonly claudeSessionHistoryService: ClaudeSessionHistoryService
  ) {}

  async createChatSessionFromExecution(
    context: ClaudeChatContext,
    claudeSessionId: string,
    commandMeta?: { command?: string; customPrompt?: string }
  ): Promise<ChatSessionSummary> {
    const now = new Date();
    const record = await this.chatSessionRepository.create({
      id: randomUUID(),
      project_id: context.projectId,
      target_type: context.targetType,
      target_number: context.targetNumber,
      scope_type: context.scopeType,
      scope_target_id: context.scopeTargetId,
      claude_session_id: claudeSessionId,
      title: context.title ?? null,
      command: commandMeta?.command ?? null,
      custom_prompt: commandMeta?.customPrompt ?? null,
      created_at: now,
      updated_at: now,
      last_used_at: now,
    });

    return ChatSessionSummaryDto.fromModel(record);
  }

  async listChatSessions(
    projectId: string,
    targetType: ChatSessionTargetType,
    targetNumber: number,
    filters: ListChatSessionsFilters = {}
  ): Promise<ChatSessionSummary[]> {
    const records = await this.chatSessionRepository.findManyByProjectAndTarget(
      projectId,
      targetType,
      targetNumber,
      filters
    );
    return records.map(ChatSessionSummaryDto.fromModel);
  }

  async markChatSessionAsUsed(claudeSessionId: string): Promise<void> {
    const now = new Date();
    await this.chatSessionRepository.markAsUsedByClaudeSessionId(
      claudeSessionId,
      now
    );
  }

  async getChatSession(
    projectId: string,
    targetType: ChatSessionTargetType,
    targetNumber: number,
    sessionId: string
  ): Promise<ChatSessionSummary> {
    const record = await this.chatSessionRepository.findById(sessionId);

    if (
      !record ||
      record.project_id !== projectId ||
      record.target_type !== targetType ||
      record.target_number !== targetNumber
    ) {
      throw new AppError('Chat session not found', HttpStatus.NOT_FOUND);
    }

    return ChatSessionSummaryDto.fromModel(record);
  }

  async getChatSessionHistory(
    projectId: string,
    targetType: ChatSessionTargetType,
    targetNumber: number,
    sessionId: string
  ): Promise<ChatSessionHistoryResponse> {
    const workingDirectory =
      await this.projectRepository.findWorkingDirectoryById(projectId);

    if (!workingDirectory) {
      throw new AppError('Project not found', HttpStatus.NOT_FOUND);
    }

    const session = await this.getChatSession(
      projectId,
      targetType,
      targetNumber,
      sessionId
    );
    const history =
      await this.claudeSessionHistoryService.getClaudeSessionHistory({
        claudeSessionId: session.claudeSessionId,
        workingDir: workingDirectory,
        command: session.command,
        customPrompt: session.customPrompt,
      });

    return ChatSessionHistoryResponseDto.of(
      session.id,
      history.claudeSessionId,
      history.entries
    );
  }
}
