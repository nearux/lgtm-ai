import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IssueListItem } from '../../types/issues.js';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}));

const { IssueListService } = await import('./issue-list.service.js');

describe('IssueListService.fetchIssueList', () => {
  let service: InstanceType<typeof IssueListService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IssueListService();
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

  const mockResponse = {
    data: {
      repository: {
        issues: {
          totalCount: 1,
          nodes: mockIssueNodes,
        },
      },
    },
  };

  it('returns issue list with correct shape', async () => {
    // given
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

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
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: {
          repository: { issues: { totalCount: 250, nodes: mockIssueNodes } },
        },
      }),
    });

    // when
    const result = await service.fetchIssueList('owner/repo', { limit: 100 });

    // then
    expect(result.lastPage).toBe(3);
  });

  it('passes OPEN state to gh CLI for open filter', async () => {
    // given
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

    // when
    await service.fetchIssueList('owner/repo', { state: 'open' });

    // then
    const args = mockExecAsync.mock.calls[0][1] as string[];
    expect(args).toContain('states[]=OPEN');
  });

  it('passes CLOSED state to gh CLI for closed filter', async () => {
    // given
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

    // when
    await service.fetchIssueList('owner/repo', { state: 'closed' });

    // then
    const args = mockExecAsync.mock.calls[0][1] as string[];
    expect(args).toContain('states[]=CLOSED');
  });

  it('returns empty items when GraphQL returns null nodes', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: { repository: { issues: { totalCount: 0, nodes: null } } },
      }),
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
    const cursorResponse = {
      data: {
        repository: {
          issues: {
            pageInfo: { endCursor: 'cursor_abc' },
          },
        },
      },
    };

    mockExecAsync
      .mockResolvedValueOnce({ stdout: JSON.stringify(cursorResponse) })
      .mockResolvedValueOnce({ stdout: JSON.stringify(mockResponse) });

    // when
    const result = await service.fetchIssueList('owner/repo', {
      page: 2,
      limit: 10,
    });

    // then
    expect(mockExecAsync).toHaveBeenCalledTimes(2);
    const cursorArgs = mockExecAsync.mock.calls[0][1] as string[];
    expect(cursorArgs).toContain('skip=10');

    const listArgs = mockExecAsync.mock.calls[1][1] as string[];
    expect(listArgs).toContain('after=cursor_abc');

    expect(result.items).toHaveLength(1);
  });

  it('returns empty items when cursor hop returns null (page exceeds total)', async () => {
    // given
    const emptyCursorResponse = {
      data: {
        repository: {
          issues: {
            pageInfo: { endCursor: null },
          },
        },
      },
    };

    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify(emptyCursorResponse),
    });

    // when
    const result = await service.fetchIssueList('owner/repo', {
      page: 5,
      limit: 10,
    });

    // then
    expect(result.items).toHaveLength(0);
    expect(result.lastPage).toBe(1);
  });

  it('throws when GraphQL response contains errors', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        errors: [{ message: 'Some GraphQL error' }],
      }),
    });

    // when / then
    await expect(service.fetchIssueList('owner/repo')).rejects.toThrow(
      'Failed to fetch PR data from GitHub'
    );
  });

  it('throws when GraphQL response has no repository', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: { repository: null },
      }),
    });

    // when / then
    await expect(service.fetchIssueList('owner/repo')).rejects.toThrow(
      'Cannot access this repository'
    );
  });

  it('maps authentication error to AppError with 503', async () => {
    // given
    mockExecAsync.mockRejectedValue(new Error('authentication required'));

    const { AppError } = await import('../../errors/AppError.js');
    type AppErrorInstance = InstanceType<typeof AppError>;

    // when / then
    try {
      await service.fetchIssueList('owner/repo');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppErrorInstance).statusCode).toBe(503);
    }
  });

  it('maps not found error to 403 AppError', async () => {
    // given
    mockExecAsync.mockRejectedValue(new Error('not found'));

    const { AppError } = await import('../../errors/AppError.js');
    type AppErrorInstance = InstanceType<typeof AppError>;

    // when / then
    try {
      await service.fetchIssueList('owner/repo');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppErrorInstance).statusCode).toBe(403);
    }
  });

  it('defaults to open state when given an invalid state value', async () => {
    // given
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

    // when
    await service.fetchIssueList('owner/repo', {
      state: 'invalid' as never,
    });

    // then
    const args = mockExecAsync.mock.calls[0][1] as string[];
    expect(args).toContain('states[]=OPEN');
  });

  it('handles null author and null body fields in GraphQL node', async () => {
    // given
    const nodeWithNulls = {
      ...mockIssueNodes[0],
      body: null,
      author: null,
      assignees: { nodes: [] },
      labels: { nodes: [] },
      comments: { totalCount: 0 },
    };

    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: {
          repository: {
            issues: { totalCount: 1, nodes: [nodeWithNulls] },
          },
        },
      }),
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
