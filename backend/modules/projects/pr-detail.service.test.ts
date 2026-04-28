import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GhGraphQLClient } from './gh-graphql.client.js';
import { PRDetailService } from './pr-detail.service.js';
import { AppError } from '../../errors/AppError.js';
import HttpStatus from 'http-status';

describe('PRDetailService.fetchPRDetail', () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let service: PRDetailService;

  beforeEach(() => {
    mockRequest = vi.fn();
    const mockClient = { request: mockRequest } as unknown as GhGraphQLClient;
    service = new PRDetailService(mockClient);
  });

  const makePRNode = (overrides: Record<string, unknown> = {}) => ({
    number: 1,
    title: 'Test PR',
    body: 'Test body',
    state: 'OPEN',
    baseRefName: 'main',
    headRefName: 'feature/test',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    totalCommentsCount: 0,
    assignees: { nodes: [{ id: 'U_1', login: 'user1', name: 'User One' }] },
    author: {
      __typename: 'User',
      id: 'U_2',
      login: 'author1',
      name: 'Author One',
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
    },
    comments: { nodes: [] },
    reviews: { nodes: [] },
    commits: { nodes: [] },
    ...overrides,
  });

  const makeAuthor = (overrides: Record<string, unknown> = {}) => ({
    __typename: 'User',
    id: 'U_0',
    login: 'user0',
    name: 'User Zero',
    avatarUrl: '',
    ...overrides,
  });

  const makeReviewCommentNode = (overrides: Record<string, unknown> = {}) => ({
    id: 'PRRC_0',
    replyTo: null,
    author: makeAuthor(),
    body: '',
    path: 'a.ts',
    diffHunk: '@@ -1 +1 @@',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const makeReviewNode = (overrides: Record<string, unknown> = {}) => ({
    id: 'PRR_0',
    author: makeAuthor(),
    state: 'COMMENTED',
    body: '',
    submittedAt: '2024-01-01T00:00:00Z',
    comments: { nodes: [] },
    ...overrides,
  });

  const makeIssueCommentNode = (overrides: Record<string, unknown> = {}) => ({
    id: 'IC_0',
    author: makeAuthor(),
    body: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  function mockPRResponse(prNode: Record<string, unknown>) {
    mockRequest.mockResolvedValue({
      repository: { pullRequest: prNode },
    });
  }

  it('returns basic PR detail from GraphQL response', async () => {
    // given
    mockPRResponse(makePRNode());

    // when
    const result = await service.fetchPRDetail('owner/repo', 1);

    // then
    expect(result.number).toBe(1);
    expect(result.title).toBe('Test PR');
    expect(result.baseBranch).toBe('main');
    expect(result.headBranch).toBe('feature/test');
    expect(result.state).toBe('OPEN');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ owner: 'owner', name: 'repo', number: 1 })
    );
  });

  it('includes inline comments nested inside reviews', async () => {
    // given
    const reviewer = makeAuthor({
      id: 'U_3',
      login: 'reviewer1',
      name: 'Reviewer One',
      avatarUrl: 'https://avatars.githubusercontent.com/u/3',
    });
    mockPRResponse(
      makePRNode({
        reviews: {
          nodes: [
            makeReviewNode({
              id: 'PRR_1',
              author: reviewer,
              submittedAt: '2024-01-01T11:00:00Z',
              comments: {
                nodes: [
                  makeReviewCommentNode({
                    id: 'PRRC_1',
                    author: reviewer,
                    body: 'Nit: rename this variable.',
                    path: 'src/index.ts',
                    diffHunk: '@@ -1,3 +1,4 @@',
                    createdAt: '2024-01-01T11:00:00Z',
                    updatedAt: '2024-01-01T11:00:00Z',
                  }),
                ],
              },
            }),
          ],
        },
      })
    );

    // when
    const result = await service.fetchPRDetail('owner/repo', 1);

    // then
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].inlineComments).toHaveLength(1);
    expect(result.reviews[0].inlineComments[0].body).toBe(
      'Nit: rename this variable.'
    );
    expect(result.reviews[0].inlineComments[0].path).toBe('src/index.ts');
    expect(result.reviews[0].inlineComments[0].diffHunk).toBe(
      '@@ -1,3 +1,4 @@'
    );
    expect(result.reviews[0].inlineComments[0].author.login).toBe('reviewer1');
  });

  it('sets inReplyToId when replyTo is present', async () => {
    // given
    mockPRResponse(
      makePRNode({
        reviews: {
          nodes: [
            makeReviewNode({
              id: 'PRR_1',
              comments: {
                nodes: [
                  makeReviewCommentNode({
                    id: 'PRRC_2',
                    replyTo: { id: 'PRRC_1' },
                    body: 'Reply comment',
                    createdAt: '2024-01-01T12:00:00Z',
                    updatedAt: '2024-01-01T12:00:00Z',
                  }),
                ],
              },
            }),
          ],
        },
      })
    );

    // when
    const result = await service.fetchPRDetail('owner/repo', 1);

    // then
    expect(result.reviews[0].inlineComments[0].inReplyToId).toBe('PRRC_1');
  });

  it('totalCommentsCount sums issue comments, inline comments, and non-empty review bodies', async () => {
    // given
    mockPRResponse(
      makePRNode({
        comments: {
          nodes: [
            makeIssueCommentNode({
              id: 'IC_1',
              body: 'hi',
              createdAt: '2024-01-01T10:00:00Z',
              updatedAt: '2024-01-01T10:00:00Z',
            }),
            makeIssueCommentNode({
              id: 'IC_2',
              body: 'hello',
              createdAt: '2024-01-01T10:01:00Z',
              updatedAt: '2024-01-01T10:01:00Z',
            }),
          ],
        },
        reviews: {
          nodes: [
            makeReviewNode({
              id: 'PRR_1',
              submittedAt: '2024-01-01T11:00:00Z',
              comments: {
                nodes: [
                  makeReviewCommentNode({
                    id: 'PRRC_1',
                    body: 'inline 1',
                    createdAt: '2024-01-01T11:00:00Z',
                    updatedAt: '2024-01-01T11:00:00Z',
                  }),
                  makeReviewCommentNode({
                    id: 'PRRC_2',
                    body: 'inline 2',
                    diffHunk: '@@ -2 +2 @@',
                    createdAt: '2024-01-01T11:01:00Z',
                    updatedAt: '2024-01-01T11:01:00Z',
                  }),
                ],
              },
            }),
            makeReviewNode({
              id: 'PRR_2',
              state: 'APPROVED',
              body: 'LGTM',
              submittedAt: '2024-01-01T12:00:00Z',
            }),
          ],
        },
      })
    );

    // when
    const result = await service.fetchPRDetail('owner/repo', 1);

    // then: 2 issue comments + 2 inline + 1 non-empty review body = 5
    expect(result.totalCommentsCount).toBe(5);
  });

  it('throws NOT_FOUND when PR does not exist in GraphQL response', async () => {
    // given
    mockRequest.mockResolvedValue({ repository: { pullRequest: null } });

    // when / then
    await expect(
      service.fetchPRDetail('owner/repo', 999)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws BAD_GATEWAY on GraphQL errors field', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GraphQL query failed: something went wrong',
        HttpStatus.BAD_GATEWAY
      )
    );

    // when / then
    await expect(service.fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('throws FORBIDDEN error when PR could not be resolved', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN
      )
    );

    // when / then
    await expect(
      service.fetchPRDetail('owner/repo', 999)
    ).rejects.toMatchObject({
      message:
        'Cannot access this repository. Try switching your GitHub account in the header.',
      statusCode: 403,
    });
  });

  it('throws SERVICE_UNAVAILABLE error for authentication failure', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    );

    // when / then
    await expect(service.fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
      message:
        'GitHub CLI is not authenticated. Please check your account in the header.',
      statusCode: 503,
    });
  });

  it('throws INTERNAL_SERVER_ERROR for general failures', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'Failed to fetch PR data from GitHub',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    );

    // when / then
    await expect(service.fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
      message: 'Failed to fetch PR data from GitHub',
      statusCode: 500,
    });
  });

  it('maps author login to id and name when id/name are absent', async () => {
    // given
    mockPRResponse(
      makePRNode({
        author: makeAuthor({
          login: 'author1',
          id: undefined,
          name: undefined,
        }),
        comments: {
          nodes: [
            makeIssueCommentNode({
              id: 'IC_1',
              author: makeAuthor({
                login: 'commenter1',
                id: undefined,
                name: undefined,
              }),
              body: 'Nice change!',
            }),
          ],
        },
        reviews: {
          nodes: [
            makeReviewNode({
              id: 'PRR_1',
              author: makeAuthor({
                login: 'reviewer1',
                id: undefined,
                name: undefined,
              }),
            }),
          ],
        },
      })
    );

    // when
    const result = await service.fetchPRDetail('owner/repo', 1);

    // then
    expect(result.author.id).toBe('author1');
    expect(result.author.name).toBe('author1');
    expect(result.reviews[0].author.id).toBe('reviewer1');
    expect(result.reviews[0].author.name).toBe('reviewer1');
    expect(result.comments[0].author.id).toBe('commenter1');
    expect(result.comments[0].author.name).toBe('commenter1');
  });

  it('marks bot authors with is_bot flag', async () => {
    // given
    mockPRResponse(
      makePRNode({
        author: {
          __typename: 'Bot',
          id: 'B_1',
          login: 'dependabot',
          avatarUrl: 'https://avatars.githubusercontent.com/in/29110',
        },
      })
    );

    // when
    const result = await service.fetchPRDetail('owner/repo', 1);

    // then
    expect(result.author.is_bot).toBe(true);
  });
});
