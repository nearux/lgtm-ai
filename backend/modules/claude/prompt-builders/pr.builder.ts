import HttpStatus from 'http-status';
import type { PrCommand, PRCommandContext } from '../types.js';
import { AppError } from '../../../errors/AppError.js';
import * as templates from '../prompt-templates.util.js';

export function buildPrUserPrompt(
  command: PrCommand,
  context: PRCommandContext,
  customPrompt?: string
): string {
  const { repoOwnerName, number: prNumber } = context.prMeta;
  switch (command) {
    case 'review':
      return templates.reviewPrPrompt(repoOwnerName, prNumber);
    case 'explain':
      return templates.explainPrPrompt(repoOwnerName, prNumber);
    case 'custom':
      if (!customPrompt || customPrompt.trim() === '') {
        throw new AppError(
          'customPrompt is required for custom command',
          HttpStatus.BAD_REQUEST
        );
      }
      return templates.customPrPrompt(customPrompt, repoOwnerName, prNumber);
  }
}
