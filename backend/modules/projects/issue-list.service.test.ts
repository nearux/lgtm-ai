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
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

    const result = await service.fetchIssueList('owner/repo', {
      state: 'open',
    });

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
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: {
          repository: { issues: { totalCount: 250, nodes: mockIssueNodes } },
        },
      }),
    });

    const result = await service.fetchIssueList('owner/repo', { limit: 100 });

    expect(result.lastPage).toBe(3);
  });

  it('passes OPEN state to gh CLI for open filter', async () => {
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

    await service.fetchIssueList('owner/repo', { state: 'open' });

    const args = mockExecAsync.mock.calls[0][1] as string[];
    expect(args).toContain('states[]=OPEN');
  });

  it('passes CLOSED state to gh CLI for closed filter', async () => {
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(mockResponse) });

    await service.fetchIssueList('owner/repo', { state: 'closed' });

    const args = mockExecAsync.mock.calls[0][1] as string[];
    expect(args).toContain('states[]=CLOSED');
  });

  it('returns empty items when GraphQL returns null nodes', async () => {
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        data: { repository: { issues: { totalCount: 0, nodes: null } } },
      }),
    });

    const result = await service.fetchIssueList('owner/repo');

    expect(result.items).toHaveLength(0);
    expect(result.lastPage).toBe(1);
  });

  it('throws on invalid repoOwnerName', async () => {
    await expect(service.fetchIssueList('invalid')).rejects.toThrow();
  });
});
