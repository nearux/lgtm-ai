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
});
