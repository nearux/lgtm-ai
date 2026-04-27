import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PRListItem } from './pull-request.types.js';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}));

const { PRListService } = await import('./pr-list.service.js');

describe('PRListService.fetchPRList', () => {
  let service: InstanceType<typeof PRListService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PRListService();
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

  function mockGraphQLDataResponse(
    totalCount: number,
    nodes = mockGraphQLNodes
  ) {
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({
        data: { repository: { pullRequests: { totalCount, nodes } } },
      }),
      stderr: '',
    });
  }

  function mockGraphQLCursorResponse(endCursor: string) {
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({
        data: { repository: { pullRequests: { pageInfo: { endCursor } } } },
      }),
      stderr: '',
    });
  }

  it('should successfully fetch PR list (page 1 — single GraphQL call)', async () => {
    // given
    mockGraphQLDataResponse(2);

    // when
    const result = await service.fetchPRList('owner/repo');

    // then
    expect(result).toEqual({ items: mockPRListData, lastPage: 1 });
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    expect(mockExecAsync).toHaveBeenCalledWith('gh', [
      'api',
      'graphql',
      '-f',
      expect.stringContaining('query='),
      '-f',
      'owner=owner',
      '-f',
      'name=repo',
      '-F',
      'limit=100',
      '-f',
      'states[]=OPEN',
    ]);
  });

  it('should fetch with cursor for page 2 (two GraphQL calls)', async () => {
    // given
    mockGraphQLCursorResponse('cursor_abc');
    mockGraphQLDataResponse(150);

    // when
    await service.fetchPRList('owner/repo', { page: 2, limit: 50 });

    // then
    expect(mockExecAsync).toHaveBeenCalledTimes(2);
    expect(mockExecAsync).toHaveBeenNthCalledWith(1, 'gh', [
      'api',
      'graphql',
      '-f',
      expect.stringContaining('query='),
      '-f',
      'owner=owner',
      '-f',
      'name=repo',
      '-F',
      'skip=50',
      '-f',
      'states[]=OPEN',
    ]);
    expect(mockExecAsync).toHaveBeenNthCalledWith(2, 'gh', [
      'api',
      'graphql',
      '-f',
      expect.stringContaining('query='),
      '-f',
      'owner=owner',
      '-f',
      'name=repo',
      '-F',
      'limit=50',
      '-f',
      'states[]=OPEN',
      '-f',
      'after=cursor_abc',
    ]);
  });

  it('should hop in chunks of 100 when skip exceeds GitHub GraphQL limit (page=3, limit=100)', async () => {
    // given: skip = (3-1) * 100 = 200, must be fetched in 2 hops of 100 each
    mockGraphQLCursorResponse('cursor_after_100'); // first hop: first:100, no after
    mockGraphQLCursorResponse('cursor_after_200'); // second hop: first:100, after:cursor_after_100
    mockGraphQLDataResponse(300);

    // when
    await service.fetchPRList('owner/repo', { page: 3, limit: 100 });

    // then: 2 cursor-resolution calls + 1 data call = 3 total
    expect(mockExecAsync).toHaveBeenCalledTimes(3);

    // First hop: first:100, no after
    expect(mockExecAsync).toHaveBeenNthCalledWith(1, 'gh', [
      'api',
      'graphql',
      '-f',
      expect.stringContaining('query='),
      '-f',
      'owner=owner',
      '-f',
      'name=repo',
      '-F',
      'skip=100',
      '-f',
      'states[]=OPEN',
    ]);

    // Second hop: first:100, after cursor from first hop
    expect(mockExecAsync).toHaveBeenNthCalledWith(2, 'gh', [
      'api',
      'graphql',
      '-f',
      expect.stringContaining('query='),
      '-f',
      'owner=owner',
      '-f',
      'name=repo',
      '-F',
      'skip=100',
      '-f',
      'states[]=OPEN',
      '-f',
      'after=cursor_after_100',
    ]);
  });

  it('should calculate lastPage from totalCount', async () => {
    // given
    mockGraphQLDataResponse(250);

    // when
    const result = await service.fetchPRList('owner/repo', { limit: 50 });

    // then
    expect(result.lastPage).toBe(5);
  });

  it('should return lastPage 1 when totalCount is 0', async () => {
    // given
    mockGraphQLDataResponse(0, []);

    // when
    const result = await service.fetchPRList('owner/repo');

    // then
    expect(result).toEqual({ items: [], lastPage: 1 });
  });

  it('should pass state=open via GraphQL states filter', async () => {
    // given
    mockGraphQLDataResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'open' });

    // then
    expect(mockExecAsync).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['-f', 'states[]=OPEN'])
    );
  });

  it('should pass state=closed via GraphQL states filter', async () => {
    // given
    mockGraphQLDataResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'closed' });

    // then
    const args = mockExecAsync.mock.calls[0][1] as string[];
    const statesArgs = args.filter(
      (_, i) => args[i - 1] === '-f' && args[i].startsWith('states[]=')
    );
    expect(statesArgs).toEqual(['states[]=CLOSED', 'states[]=MERGED']);
  });

  it('should pass state=all via GraphQL states filter', async () => {
    // given
    mockGraphQLDataResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'all' });

    // then
    const args = mockExecAsync.mock.calls[0][1] as string[];
    const statesArgs = args.filter(
      (_, i) => args[i - 1] === '-f' && args[i].startsWith('states[]=')
    );
    expect(statesArgs).toEqual([
      'states[]=OPEN',
      'states[]=CLOSED',
      'states[]=MERGED',
    ]);
  });

  it('should default to state=open for invalid state value', async () => {
    // given
    mockGraphQLDataResponse(2);

    // when
    await service.fetchPRList('owner/repo', { state: 'invalid' as never });

    // then
    expect(mockExecAsync).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['-f', 'states[]=OPEN'])
    );
  });

  it('should clamp invalid page and limit values', async () => {
    // given
    mockGraphQLDataResponse(2);

    // when
    await service.fetchPRList('owner/repo', { page: 0, limit: 250 });

    // then
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    expect(mockExecAsync).toHaveBeenCalledWith('gh', [
      'api',
      'graphql',
      '-f',
      expect.stringContaining('query='),
      '-f',
      'owner=owner',
      '-f',
      'name=repo',
      '-F',
      'limit=100',
      '-f',
      'states[]=OPEN',
    ]);
  });

  it('should throw SERVICE_UNAVAILABLE error for authentication failure', async () => {
    // given
    mockExecAsync.mockRejectedValue(
      new Error('authentication required: gh auth login')
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
    mockExecAsync.mockRejectedValue(new Error('Not Found'));

    // when / then
    await expect(service.fetchPRList('owner/repo')).rejects.toMatchObject({
      message:
        'Cannot access this repository. Try switching your GitHub account in the header.',
      statusCode: 403,
    });
  });

  it('should throw INTERNAL_SERVER_ERROR for general failures', async () => {
    // given
    mockExecAsync.mockRejectedValue(new Error('Network error'));

    // when / then
    await expect(service.fetchPRList('owner/repo')).rejects.toMatchObject({
      message: 'Failed to fetch PR data from GitHub',
      statusCode: 500,
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
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({ errors: [{ message: 'Field does not exist' }] }),
      stderr: '',
    });

    // when / then
    await expect(service.fetchPRList('owner/repo')).rejects.toMatchObject({
      message: 'GraphQL query failed: Field does not exist',
      statusCode: 502,
    });
  });

  it('should return empty result when page is out of bounds (cursor is null)', async () => {
    // given
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({
        data: {
          repository: { pullRequests: { pageInfo: { endCursor: null } } },
        },
      }),
      stderr: '',
    });

    // when
    const result = await service.fetchPRList('owner/repo', {
      page: 999,
      limit: 10,
    });

    // then
    expect(result).toEqual({ items: [], lastPage: 1 });
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
  });
});
