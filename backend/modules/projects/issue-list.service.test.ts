import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IssueListItem } from '../../types/issues.js';
import { GhGraphQLClient } from './gh-graphql.client.js';
import { IssueListService } from './issue-list.service.js';
import { AppError } from '../../errors/AppError.js';
import HttpStatus from 'http-status';

describe('IssueListService.fetchIssueList', () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let service: IssueListService;

  beforeEach(() => {
    mockRequest = vi.fn();
    const mockClient = { request: mockRequest } as unknown as GhGraphQLClient;
    service = new IssueListService(mockClient);
  });

  const mockIssueNodes = [
    {
      number: 1,
      title: 'Bug report',
      body: 'Something is broken',
      state: 'OPEN',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      comments: { totalCount: 3 },
      assignees: { nodes: [{ id: 'U_1', login: 'user1', name: 'User One' }] },
      author: {
        id: 'U_2',
        login: 'author1',
        name: 'Author One',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      },
      labels: { nodes: [{ id: 'L_1', name: 'bug', color: 'ee0701' }] },
    },
  ];

  function mockListResponse(totalCount: number, nodes = mockIssueNodes) {
    mockRequest.mockResolvedValueOnce({
      repository: { issues: { totalCount, nodes } },
    });
  }

  function mockCursorResponse(endCursor: string | null) {
    mockRequest.mockResolvedValueOnce({
      repository: { issues: { pageInfo: { endCursor } } },
    });
  }

  it('returns issue list with correct shape', async () => {
    // given
    mockListResponse(1);

    // when
    const result = await service.fetchIssueList('owner/repo', {
      state: 'open',
    });

    // then
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject<IssueListItem>({
      number: 1,
      title: 'Bug report',
      body: 'Something is broken',
      state: 'OPEN',
      totalCommentsCount: 3,
      assignees: [{ id: 'U_1', login: 'user1', name: 'User One' }],
      author: {
        id: 'U_2',
        login: 'author1',
        name: 'Author One',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      },
      labels: [{ id: 'L_1', name: 'bug', color: 'ee0701' }],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
    expect(result.lastPage).toBe(1);
  });

  it('calculates lastPage correctly', async () => {
    // given
    mockListResponse(250);

    // when
    const result = await service.fetchIssueList('owner/repo', { limit: 100 });

    // then
    expect(result.lastPage).toBe(3);
  });

  it('passes OPEN state to client for open filter', async () => {
    // given
    mockListResponse(1);

    // when
    await service.fetchIssueList('owner/repo', { state: 'open' });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['OPEN'] })
    );
  });

  it('passes CLOSED state to client for closed filter', async () => {
    // given
    mockListResponse(1);

    // when
    await service.fetchIssueList('owner/repo', { state: 'closed' });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['CLOSED'] })
    );
  });

  it('returns empty items when GraphQL returns null nodes', async () => {
    // given
    mockRequest.mockResolvedValueOnce({
      repository: { issues: { totalCount: 0, nodes: null } },
    });

    // when
    const result = await service.fetchIssueList('owner/repo');

    // then
    expect(result.items).toHaveLength(0);
    expect(result.lastPage).toBe(1);
  });

  it('throws on invalid repoOwnerName', async () => {
    // given / when / then
    await expect(service.fetchIssueList('invalid')).rejects.toThrow();
  });

  it('fetches page 2 by resolving cursor first', async () => {
    // given
    mockCursorResponse('cursor_abc');
    mockListResponse(1);

    // when
    const result = await service.fetchIssueList('owner/repo', {
      page: 2,
      limit: 10,
    });

    // then
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ skip: 10 })
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ after: 'cursor_abc' })
    );
    expect(result.items).toHaveLength(1);
  });

  it('returns empty items when cursor hop returns null (page exceeds total)', async () => {
    // given
    mockCursorResponse(null);

    // when
    const result = await service.fetchIssueList('owner/repo', {
      page: 5,
      limit: 10,
    });

    // then
    expect(result.items).toHaveLength(0);
    expect(result.lastPage).toBe(1);
  });

  it('throws BAD_GATEWAY when client throws GraphQL error', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GraphQL query failed: Some GraphQL error',
        HttpStatus.BAD_GATEWAY
      )
    );

    // when / then
    await expect(service.fetchIssueList('owner/repo')).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('throws BAD_GATEWAY when GraphQL response has no repository', async () => {
    // given
    mockRequest.mockResolvedValueOnce({ repository: null });

    // when / then
    await expect(service.fetchIssueList('owner/repo')).rejects.toMatchObject({
      message:
        'GraphQL query failed: repository owner/repo not found or issues inaccessible',
      statusCode: 502,
    });
  });

  it('maps authentication error to AppError with 503', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    );

    // when / then
    await expect(service.fetchIssueList('owner/repo')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('maps not found error to 403 AppError', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN
      )
    );

    // when / then
    await expect(service.fetchIssueList('owner/repo')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('defaults to open state when given an invalid state value', async () => {
    // given
    mockListResponse(1);

    // when
    await service.fetchIssueList('owner/repo', { state: 'invalid' as never });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['OPEN'] })
    );
  });

  it('handles null author and null body fields in GraphQL node', async () => {
    // given
    mockRequest.mockResolvedValueOnce({
      repository: {
        issues: {
          totalCount: 1,
          nodes: [
            {
              ...mockIssueNodes[0],
              body: null,
              author: null,
              assignees: { nodes: [] },
              labels: { nodes: [] },
              comments: { totalCount: 0 },
            },
          ],
        },
      },
    });

    // when
    const result = await service.fetchIssueList('owner/repo');
    const item = result.items[0];

    // then
    expect(item.body).toBe('');
    expect(item.author.login).toBe('');
    expect(item.author.avatarUrl).toBe('');
    expect(item.assignees).toHaveLength(0);
    expect(item.labels).toHaveLength(0);
  });
});
