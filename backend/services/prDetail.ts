import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  PRDetail,
  GhPRDetail,
  GhReviewInlineComment,
} from '../types/pullRequests.js';
import { PRDetailDto } from '../dtos/prDetailDto.js';
import { validateRepoOwnerName, mapGhError } from './ghUtils.js';

const execFileAsync = promisify(execFile);

async function fetchRawPRInlineComments(
  repoOwnerName: string,
  prNumber: number
): Promise<GhReviewInlineComment[]> {
  const { stdout } = await execFileAsync('gh', [
    'api',
    '--method',
    'GET',
    `repos/${repoOwnerName}/pulls/${prNumber}/comments`,
  ]);
  return JSON.parse(stdout) as GhReviewInlineComment[];
}

async function resolveNodeIdToNumericId(
  repoOwnerName: string,
  prNumber: number,
  reviewIds: string[]
): Promise<Map<string, number>> {
  const nodeIds = reviewIds.filter((id) => id.startsWith('PRR_'));
  if (nodeIds.length === 0) return new Map();

  try {
    const { stdout } = await execFileAsync('gh', [
      'api',
      `repos/${repoOwnerName}/pulls/${prNumber}/reviews`,
    ]);
    const reviewsList = JSON.parse(stdout) as Array<{
      id: number;
      node_id: string;
    }>;
    return new Map(
      reviewsList
        .filter((r) => nodeIds.includes(r.node_id))
        .map((r) => [r.node_id, r.id])
    );
  } catch (err) {
    console.error(
      `[fetchReviewInlineComments] Failed to fetch reviews list for PR #${prNumber}:`,
      err
    );
    return new Map();
  }
}

/**
 * Builds a map from numeric review ID → original review ID string.
 * Handles both plain numeric IDs ("123") and GitHub node IDs ("PRR_xxx").
 */
export function buildReviewIdMap(
  reviewIds: string[],
  nodeIdToNumericId: Map<string, number>
): Map<number, string> {
  const toNumericId = (reviewId: string): number | null => {
    if (reviewId.startsWith('PRR_')) {
      return nodeIdToNumericId.get(reviewId) ?? null;
    }
    const parsed = parseInt(reviewId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return new Map(
    reviewIds.flatMap((reviewId) => {
      const numericId = toNumericId(reviewId);
      return numericId !== null ? [[numericId, reviewId]] : [];
    })
  );
}

/**
 * Groups inline comments by their review ID string.
 * Comments not belonging to any known review are dropped.
 */
export function groupCommentsByReview(
  allComments: GhReviewInlineComment[],
  numericIdToReviewId: Map<number, string>,
  reviewIds: string[]
): Map<string, GhReviewInlineComment[]> {
  return allComments.reduce(
    (grouped, comment) => {
      const reviewId = numericIdToReviewId.get(comment.pull_request_review_id);
      if (reviewId !== undefined) {
        grouped.get(reviewId)!.push(comment);
      }
      return grouped;
    },
    new Map<string, GhReviewInlineComment[]>(reviewIds.map((id) => [id, []]))
  );
}

async function fetchReviewInlineComments(
  repoOwnerName: string,
  prNumber: number,
  reviewIds: string[]
): Promise<Map<string, GhReviewInlineComment[]>> {
  const [allComments, nodeIdToNumericId] = await Promise.all([
    fetchRawPRInlineComments(repoOwnerName, prNumber),
    resolveNodeIdToNumericId(repoOwnerName, prNumber, reviewIds),
  ]);

  const numericIdToReviewId = buildReviewIdMap(reviewIds, nodeIdToNumericId);

  return groupCommentsByReview(allComments, numericIdToReviewId, reviewIds);
}

/**
 * Fetch PR detail with comments using gh pr view
 */
export async function fetchPRDetail(
  repoOwnerName: string,
  prNumber: number
): Promise<PRDetail> {
  validateRepoOwnerName(repoOwnerName);

  let stdout: string;

  try {
    ({ stdout } = await execFileAsync('gh', [
      'pr',
      'view',
      String(prNumber),
      '--repo',
      repoOwnerName,
      '--json',
      'number,title,body,baseRefName,headRefName,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
    ]));
  } catch (error) {
    throw mapGhError(error, 'fetch');
  }

  const raw = JSON.parse(stdout) as GhPRDetail;
  const reviewIds = raw.reviews.map((r) => r.id);

  const inlineCommentsByReview = await fetchReviewInlineComments(
    repoOwnerName,
    prNumber,
    reviewIds
  );
  return PRDetailDto.fromGh(raw, inlineCommentsByReview);
}
