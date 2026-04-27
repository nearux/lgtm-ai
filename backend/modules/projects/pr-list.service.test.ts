import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PRListItem } from '../../types/pullRequests.js';
import { GhGraphQLClient } from './gh-graphql.client.js';
import { PRListService } from './pr-list.service.js';
import { AppError } from '../../errors/AppError.js';
import HttpStatus from 'http-status';

describe('PRListService.fetchPRList', () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let service: PRListService;

  beforeEach(() => {
    mockRequest = vi.fn();
    const mockClient = { request: mockRequest } as unknown as GhGraphQLClient;
    service = new PRListService(mockClient);
  });

  const mockGraphQLNodes = [
    {
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      state: 'OPEN',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      totalCommentsCount: 12,
      assignees: { nodes: [{ id: 'U_1', login: 'user1', name: 'User One' }] },
      author: {
        id: 'U_2',
        login: 'author1',
        name: 'Author One',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      },
    },
    {
      number: 2,
      title: 'Another PR',
      body: null,
      state: 'CLOSED',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
      totalCommentsCount: 2,
      assignees: { nodes: [] },
      author: {
        login: 'author2',
        avatarUrl: 'https://avatars.githubusercontent.com/u/3',
      },
    },
  ];

  const mockPRListData: PRListItem[] = [
    {
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      totalCommentsCount: 12,
      assignees: [{ id: 'U_1', login: 'user1', name: 'User One' }],
      author: {
        id: 'U_2',
        login: 'author1',
        name: 'Author One',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      state: 'OPEN',
    },
    {
      number: 2,
      title: 'Another PR',
      body: '',
      totalCommentsCount: 2,
      assignees: [],
      author: {
        id: 'author2',
        login: 'author2',
        name: 'author2',
        avatarUrl: 'https://avatars.githubusercontent.com/u/3',
      },
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
      state: 'CLOSED',
    },
  ];

  function mockListResponse(totalCount: number, nodes = mockGraphQLNodes) {
    mockRequest.mockResolvedValueOnce({
      repository: { pullRequests: { totalCount, nodes } },
    });
  }

  function mockCursorResponse(endCursor: string) {
    mockRequest.mockResolvedValueOnce({
      repository: { pullRequests: { pageInfo: { endCursor } } },
    });
  }

  it('should successfully fetch PR list (page 1 — single GraphQL call)', async () => {
    // given
    mockListResponse(2);

    // when
    const result = await service.fetchPRList('owner/repo');

    // then
    expect(result).toEqual({ items: mockPRListData, lastPage: 1 });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        owner: 'owner',
        name: 'repo',
        limit: 100,
        states: ['OPEN'],
      })
    );
  });

  it('should fetch with cursor for page 2 (two GraphQL calls)', async () => {
    // given
    mockCursorResponse('cursor_abc');
    mockListResponse(150);

    // when
    await service.fetchPRList('owner/repo', { page: 2, limit: 50 });

    // then
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ skip: 50, states: ['OPEN'] })
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        limit: 50,
        states: ['OPEN'],
        after: 'cursor_abc',
      })
    );
  });

  it('should hop in chunks of 100 when skip exceeds GitHub GraphQL limit (page=3, limit=100)', async () => {
    // given: skip = (3-1) * 100 = 200, must be fetched in 2 hops of 100 each
    mockCursorResponse('cursor_after_100');
    mockCursorResponse('cursor_after_200');
    mockListResponse(300);

    // when
    await service.fetchPRList('owner/repo', { page: 3, limit: 100 });

    // then: 2 cursor-resolution calls + 1 data call = 3 total
    expect(mockRequest).toHaveBeenCalledTimes(3);
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ skip: 100, states: ['OPEN'], after: undefined })
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        skip: 100,
        states: ['OPEN'],
        after: 'cursor_after_100',
      })
    );
  });

  it('should calculate lastPage from totalCount', async () => {
    // given
    mockListResponse(250);

    // when
    const result = await service.fetchPRList('owner/repo', { limit: 50 });

    // then
    expect(result.lastPage).toBe(5);
  });

  it('should return lastPage 1 when totalCount is 0', async () => {
    // given
    mockListResponse(0, []);

    // when
    const result = await service.fetchPRList('owner/repo');

    // then
    expect(result).toEqual({ items: [], lastPage: 1 });
  });

  it('should pass state=open via GraphQL states filter', async () => {
    // given
    mockListResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'open' });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['OPEN'] })
    );
  });

  it('should pass state=closed via GraphQL states filter', async () => {
    // given
    mockListResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'closed' });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['CLOSED', 'MERGED'] })
    );
  });

  it('should pass state=all via GraphQL states filter', async () => {
    // given
    mockListResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'all' });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['OPEN', 'CLOSED', 'MERGED'] })
    );
  });

  it('should default to state=open for invalid state value', async () => {
    // given
    mockListResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'invalid' as never });

    // then
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ states: ['OPEN'] })
    );
  });

  it('should clamp invalid page and limit values', async () => {
    // given
    mockListResponse(2);

    // when
    await service.fetchPRList('owner/repo', { page: 0, limit: 250 });

    // then
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ limit: 100 })
    );
  });

  it('should throw SERVICE_UNAVAILABLE error for authentication failure', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    );

    // when / then
    await expect(service.fetchPRList('owner/repo')).rejects.toMatchObject({
      message:
        'GitHub CLI is not authenticated. Please check your account in the header.',
      statusCode: 503,
    });
  });

  it('should throw FORBIDDEN error for not found', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN
      )
    );

    // when / then
    await expect(service.fetchPRList('owner/repo')).rejects.toMatchObject({
      message:
        'Cannot access this repository. Try switching your GitHub account in the header.',
      statusCode: 403,
    });
  });

  it('should throw BAD_REQUEST for invalid repo name', async () => {
    // given / when / then
    await expect(
      service.fetchPRList('invalid repo name!')
    ).rejects.toMatchObject({
      message: 'Invalid repository name',
      statusCode: 400,
    });
  });

  it('should throw BAD_GATEWAY when GraphQL response has errors', async () => {
    // given
    mockRequest.mockRejectedValue(
      new AppError(
        'GraphQL query failed: Field does not exist',
        HttpStatus.BAD_GATEWAY
      )
    );

    // when / then
    await expect(service.fetchPRList('owner/repo')).rejects.toMatchObject({
      message: 'GraphQL query failed: Field does not exist',
      statusCode: 502,
    });
  });

  it('should return empty result when page is out of bounds (cursor is null)', async () => {
    // given
    mockRequest.mockResolvedValueOnce({
      repository: { pullRequests: { pageInfo: { endCursor: null } } },
    });

    // when
    const result = await service.fetchPRList('owner/repo', {
      page: 999,
      limit: 10,
    });

    // then
    expect(result).toEqual({ items: [], lastPage: 1 });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
