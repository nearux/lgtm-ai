import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GhGraphQLClient } from './gh-graphql.client.js';
import { IssueDetailService } from './issue-detail.service.js';
import { AppError } from '../../errors/AppError.js';
import HttpStatus from 'http-status';

describe('IssueDetailService.fetchIssueDetail', () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let service: IssueDetailService;

  beforeEach(() => {
    mockRequest = vi.fn();
    const mockClient = { request: mockRequest } as unknown as GhGraphQLClient;
    service = new IssueDetailService(mockClient);
  });

  const mockIssueNode = {
    number: 42,
    title: 'Fix memory leak',
    body: 'There is a memory leak in the auth module.',
    state: 'OPEN',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    closedAt: null,
    url: 'https://github.com/owner/repo/issues/42',
    comments: {
      nodes: [
        {
          id: 'IC_1',
          author: {
            id: 'U_3',
            login: 'commenter',
            name: 'Commenter',
            avatarUrl: 'https://avatars.githubusercontent.com/u/3',
          },
          body: 'I can reproduce this.',
          createdAt: '2024-01-01T01:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
        },
      ],
    },
    assignees: { nodes: [{ id: 'U_1', login: 'user1', name: 'User One' }] },
    author: {
      id: 'U_2',
      login: 'author1',
      name: 'Author One',
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
    },
    labels: { nodes: [{ id: 'L_1', name: 'bug', color: 'ee0701' }] },
    milestone: { id: 'M_1', title: 'v2.0' },
  };

  it('returns issue detail with correct shape', async () => {
    // given
    mockRequest.mockResolvedValue({ repository: { issue: mockIssueNode } });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.number).toBe(42);
    expect(result.title).toBe('Fix memory leak');
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].id).toBe('IC_1');
    expect(result.assignees).toHaveLength(1);
    expect(result.labels).toHaveLength(1);
    expect(result.milestone).toEqual({ id: 'M_1', title: 'v2.0' });
    expect(result.url).toBe('https://github.com/owner/repo/issues/42');
    expect(result.closedAt).toBeNull();
  });

  it('returns null milestone when not set', async () => {
    // given
    mockRequest.mockResolvedValue({
      repository: { issue: { ...mockIssueNode, milestone: null } },
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.milestone).toBeNull();
  });

  it('throws on invalid repoOwnerName', async () => {
    // given / when / then
    await expect(service.fetchIssueDetail('invalid', 1)).rejects.toThrow();
  });

  it('throws AppError when client throws GraphQL error', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GraphQL query failed: Could not resolve to a Repository',
        HttpStatus.BAD_GATEWAY
      )
    );

    // when / then
    await expect(service.fetchIssueDetail('owner/repo', 42)).rejects.toThrow(
      'Could not resolve to a Repository'
    );
  });

  it('throws 404 AppError when issue is null in response', async () => {
    // given
    mockRequest.mockResolvedValue({ repository: { issue: null } });

    // when / then
    await expect(
      service.fetchIssueDetail('owner/repo', 42)
    ).rejects.toMatchObject({
      message: 'Issue not found',
      statusCode: 404,
    });
  });

  it('throws authentication AppError when gh CLI is not authenticated', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    );

    // when / then
    await expect(
      service.fetchIssueDetail('owner/repo', 42)
    ).rejects.toMatchObject({
      message:
        'GitHub CLI is not authenticated. Please check your account in the header.',
      statusCode: 503,
    });
  });

  it('throws 403 AppError when repository is not found', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN
      )
    );

    // when / then
    await expect(
      service.fetchIssueDetail('owner/repo', 42)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 500 AppError on unknown gh CLI error', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'Failed to fetch PR data from GitHub',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    );

    // when / then
    await expect(
      service.fetchIssueDetail('owner/repo', 42)
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it('falls back to empty string when issue body is null', async () => {
    // given
    mockRequest.mockResolvedValue({
      repository: { issue: { ...mockIssueNode, body: null } },
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.body).toBe('');
  });

  it('falls back to login when author name is missing', async () => {
    // given
    mockRequest.mockResolvedValue({
      repository: {
        issue: {
          ...mockIssueNode,
          author: {
            login: 'author1',
            avatarUrl: 'https://avatars.githubusercontent.com/u/2',
          },
        },
      },
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.author.name).toBe('author1');
  });

  it('sets is_bot true when author typename is Bot', async () => {
    // given
    mockRequest.mockResolvedValue({
      repository: {
        issue: {
          ...mockIssueNode,
          author: {
            __typename: 'Bot',
            login: 'dependabot',
            avatarUrl: 'https://avatars.githubusercontent.com/u/27347476',
          },
        },
      },
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.author.is_bot).toBe(true);
  });

  it('falls back to commentNodes length when totalCount is missing', async () => {
    // given
    mockRequest.mockResolvedValue({
      repository: {
        issue: {
          ...mockIssueNode,
          comments: { nodes: mockIssueNode.comments.nodes },
        },
      },
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.totalCommentsCount).toBe(1);
  });

  it('returns empty arrays when assignees, labels, and comment nodes are null', async () => {
    // given
    mockRequest.mockResolvedValue({
      repository: {
        issue: {
          ...mockIssueNode,
          assignees: { nodes: null },
          labels: { nodes: null },
          comments: { nodes: null },
        },
      },
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.assignees).toEqual([]);
    expect(result.labels).toEqual([]);
    expect(result.comments).toEqual([]);
  });
});
