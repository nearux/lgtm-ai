import { z } from 'zod';
import type { ChatSessionHistoryEntry } from './session-history.types.js';

export interface BlockContext {
  role: string;
  timestamp?: string;
}

const TextBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

const ToolUseBlockSchema = z.object({
  type: z.literal('tool_use'),
  name: z.string(),
  id: z.string().optional(),
  input: z.unknown().optional(),
});

const ToolResultBlockSchema = z.object({
  type: z.literal('tool_result'),
  content: z.unknown().optional(),
  tool_use_id: z.string().optional(),
  is_error: z.boolean().optional(),
});

const ContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
]);

export function expandContentBlocks(
  content: string | unknown[] | undefined,
  ctx: BlockContext
): ChatSessionHistoryEntry[] {
  if (typeof content === 'string') {
    return expandText(content, ctx);
  }
  if (!Array.isArray(content)) return [];
  return content.flatMap((block) => expandBlock(block, ctx));
}

function expandText(
  text: string,
  ctx: BlockContext
): ChatSessionHistoryEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return [
    {
      ...ctx,
      messageType: ctx.role === 'user' ? 'user' : 'text',
      content: trimmed,
    },
  ];
}

function expandBlock(
  block: unknown,
  ctx: BlockContext
): ChatSessionHistoryEntry[] {
  const parsed = ContentBlockSchema.safeParse(block);
  if (!parsed.success) return [];

  switch (parsed.data.type) {
    case 'text':
      return expandText(parsed.data.text, ctx);
    case 'tool_use':
      return [
        {
          ...ctx,
          messageType: 'tool',
          content: JSON.stringify(parsed.data.input ?? {}, null, 2),
          toolName: parsed.data.name,
          toolId: parsed.data.id,
        },
      ];
    case 'tool_result':
      return [
        {
          ...ctx,
          messageType: 'tool_result',
          content:
            typeof parsed.data.content === 'string'
              ? parsed.data.content.trim()
              : JSON.stringify(parsed.data.content ?? ''),
          toolId: parsed.data.tool_use_id,
          isError: parsed.data.is_error,
        },
      ];
  }
}
