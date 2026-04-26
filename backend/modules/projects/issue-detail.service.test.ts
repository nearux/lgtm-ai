import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}));

const { IssueDetailService } = await import('./issue-detail.service.js');

describe('IssueDetailService.fetchIssueDetail', () => {
  let service: InstanceType<typeof IssueDetailService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IssueDetailService();
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

  const mockIssueDetailData = {
    data: {
      repository: {
        issue: mockIssueNode,
      },
    },
  };

  it('returns issue detail with correct shape', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(mockIssueDetailData),
    });

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
    const dataWithoutMilestone = {
      data: {
        repository: {
          issue: { ...mockIssueNode, milestone: null },
        },
      },
    };
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(dataWithoutMilestone),
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

  it('throws AppError when GraphQL response contains errors', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        errors: [{ message: 'Could not resolve to a Repository' }],
      }),
    });

    // when
    let error: unknown;
    try {
      await service.fetchIssueDetail('owner/repo', 42);
    } catch (e) {
      error = e;
    }

    // then
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      'Could not resolve to a Repository'
    );
  });

  it('throws AppError when GraphQL response has no data', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({}),
    });

    // when
    let error: unknown;
    try {
      await service.fetchIssueDetail('owner/repo', 42);
    } catch (e) {
      error = e;
    }

    // then
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('Unknown GraphQL error');
  });

  it('throws 404 AppError when issue is null in response', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: { repository: { issue: null } },
      }),
    });

    // when
    let error: unknown;
    try {
      await service.fetchIssueDetail('owner/repo', 42);
    } catch (e) {
      error = e;
    }

    // then
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Issue not found');
    expect((error as { statusCode?: number }).statusCode).toBe(404);
  });

  it('throws authentication AppError when gh CLI is not authenticated', async () => {
    // given
    mockExecAsync.mockRejectedValue(new Error('authentication failed'));

    // when
    let error: unknown;
    try {
      await service.fetchIssueDetail('owner/repo', 42);
    } catch (e) {
      error = e;
    }

    // then
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('not authenticated');
    expect((error as { statusCode?: number }).statusCode).toBe(503);
  });

  it('throws 403 AppError when repository is not found', async () => {
    // given
    mockExecAsync.mockRejectedValue(
      new Error('could not resolve to a repository')
    );

    // when
    let error: unknown;
    try {
      await service.fetchIssueDetail('owner/repo', 42);
    } catch (e) {
      error = e;
    }

    // then
    expect((error as { statusCode?: number }).statusCode).toBe(403);
  });

  it('throws 500 AppError on unknown gh CLI error', async () => {
    // given
    mockExecAsync.mockRejectedValue(new Error('network timeout'));

    // when
    let error: unknown;
    try {
      await service.fetchIssueDetail('owner/repo', 42);
    } catch (e) {
      error = e;
    }

    // then
    expect((error as { statusCode?: number }).statusCode).toBe(500);
  });

  it('falls back to empty string when issue body is null', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: { repository: { issue: { ...mockIssueNode, body: null } } },
      }),
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.body).toBe('');
  });

  it('falls back to login when author name is missing', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: {
          repository: {
            issue: {
              ...mockIssueNode,
              author: {
                login: 'author1',
                avatarUrl: 'https://avatars.githubusercontent.com/u/2',
              },
            },
          },
        },
      }),
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.author.name).toBe('author1');
  });

  it('sets is_bot true when author typename is Bot', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: {
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
        },
      }),
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.author.is_bot).toBe(true);
  });

  it('falls back to commentNodes length when totalCount is missing', async () => {
    // given
    const issueWithoutTotalCount = {
      ...mockIssueNode,
      comments: { nodes: mockIssueNode.comments.nodes },
    };
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: { repository: { issue: issueWithoutTotalCount } },
      }),
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.totalCommentsCount).toBe(1);
  });

  it('returns empty arrays when assignees, labels, and comment nodes are null', async () => {
    // given
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: {
          repository: {
            issue: {
              ...mockIssueNode,
              assignees: { nodes: null },
              labels: { nodes: null },
              comments: { nodes: null },
            },
          },
        },
      }),
    });

    // when
    const result = await service.fetchIssueDetail('owner/repo', 42);

    // then
    expect(result.assignees).toEqual([]);
    expect(result.labels).toEqual([]);
    expect(result.comments).toEqual([]);
  });
});
