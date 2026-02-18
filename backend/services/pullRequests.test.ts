import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PRListItem, PRDetail } from '../types/pullRequests.js';

// Create mock function at the top level using vi.hoisted
const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

// Import after mocks are set up
const { fetchPRList, fetchPRDetail } = await import('./pullRequests.js');

describe('pullRequests service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPRList', () => {
    const mockPRListData: PRListItem[] = [
      {
        number: 1,
        title: 'Test PR',
        body: 'Test body',
        assignees: [{ id: '1', login: 'user1', name: 'User One' }],
        author: { id: '2', login: 'author1', name: 'Author One' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'OPEN',
      },
      {
        number: 2,
        title: 'Another PR',
        body: 'Another body',
        assignees: [],
        author: {
          id: '3',
          login: 'author2',
          name: 'Author Two',
          is_bot: false,
        },
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-04T00:00:00Z',
        state: 'CLOSED',
      },
    ];

    it('should successfully fetch PR list', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockPRListData),
        stderr: '',
      });

      const result = await fetchPRList('owner/repo');

      expect(result).toEqual(mockPRListData);
      expect(mockExecAsync).toHaveBeenCalledWith(
        'gh pr list --repo owner/repo --json number,title,body,assignees,author,createdAt,updatedAt,state --limit 100'
      );
    });

    it('should return empty array when no PRs exist', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify([]),
        stderr: '',
      });

      const result = await fetchPRList('owner/repo');

      expect(result).toEqual([]);
    });

    it('should throw SERVICE_UNAVAILABLE error for authentication failure', async () => {
      mockExecAsync.mockRejectedValue(
        new Error('authentication required: gh auth login')
      );

      await expect(fetchPRList('owner/repo')).rejects.toMatchObject({
        message: 'GitHub CLI is not available or authenticated',
        statusCode: 503,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR for general failures', async () => {
      mockExecAsync.mockRejectedValue(new Error('Network error'));

      await expect(fetchPRList('owner/repo')).rejects.toMatchObject({
        message: 'Failed to fetch PR data from GitHub',
        statusCode: 500,
      });
    });
  });

  describe('fetchPRDetail', () => {
    const mockPRDetailData: PRDetail = {
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      assignees: [{ id: '1', login: 'user1', name: 'User One' }],
      author: { id: '2', login: 'author1', name: 'Author One' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      state: 'OPEN',
      comments: [
        {
          id: 'c1',
          author: { id: '3', login: 'reviewer1', name: 'Reviewer One' },
          body: 'Looks good!',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
      reviews: [
        {
          id: 'r1',
          author: { id: '3', login: 'reviewer1', name: 'Reviewer One' },
          state: 'APPROVED',
          body: 'LGTM',
          submittedAt: '2024-01-01T11:00:00Z',
        },
      ],
      commits: [
        {
          oid: 'abc123',
          messageHeadline: 'feat: add feature',
          messageBody: 'Added new feature',
          authoredDate: '2024-01-01T09:00:00Z',
          committedDate: '2024-01-01T09:00:00Z',
          authors: [{ name: 'Author One', email: 'author@example.com' }],
        },
      ],
    };

    it('should successfully fetch PR detail', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockPRDetailData),
        stderr: '',
      });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result).toEqual(mockPRDetailData);
      expect(mockExecAsync).toHaveBeenCalledWith(
        'gh pr view 1 --repo owner/repo --json number,title,body,assignees,author,createdAt,updatedAt,state,comments,reviews,commits'
      );
    });

    it('should throw NOT_FOUND error when PR does not exist', async () => {
      mockExecAsync.mockRejectedValue(
        new Error('could not resolve to a PullRequest')
      );

      await expect(fetchPRDetail('owner/repo', 999)).rejects.toMatchObject({
        message: 'Pull request not found',
        statusCode: 404,
      });
    });

    it('should throw SERVICE_UNAVAILABLE error for authentication failure', async () => {
      mockExecAsync.mockRejectedValue(
        new Error('authentication required: gh auth login')
      );

      await expect(fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
        message: 'GitHub CLI is not available or authenticated',
        statusCode: 503,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR for general failures', async () => {
      mockExecAsync.mockRejectedValue(new Error('Network error'));

      await expect(fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
        message: 'Failed to fetch PR data from GitHub',
        statusCode: 500,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR for non-Error exceptions', async () => {
      mockExecAsync.mockRejectedValue('Unknown error');

      await expect(fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
        message: 'Failed to fetch PR data from GitHub',
        statusCode: 500,
      });
    });

    it('should handle PR with empty comments, reviews, and commits', async () => {
      const emptyDetailData: PRDetail = {
        ...mockPRDetailData,
        comments: [],
        reviews: [],
        commits: [],
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(emptyDetailData),
        stderr: '',
      });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result.comments).toEqual([]);
      expect(result.reviews).toEqual([]);
      expect(result.commits).toEqual([]);
    });
  });
});
