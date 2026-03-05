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
    const mockApiPRListData = [
      {
        number: 1,
        title: 'Test PR',
        body: 'Test body',
        assignees: [{ id: 1, login: 'user1', name: 'User One', type: 'User' }],
        user: { id: 2, login: 'author1', name: 'Author One', type: 'User' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        state: 'open',
      },
      {
        number: 2,
        title: 'Another PR',
        body: null,
        assignees: [],
        user: { id: 3, login: 'author2', type: 'Bot' },
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
        state: 'closed',
      },
    ];

    const mockPRListData: PRListItem[] = [
      {
        number: 1,
        title: 'Test PR',
        body: 'Test body',
        assignees: [{ id: '1', login: 'user1', name: 'User One' }],
        author: { id: '2', login: 'author1', name: 'Author One' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'open',
      },
      {
        number: 2,
        title: 'Another PR',
        body: '',
        assignees: [],
        author: {
          id: '3',
          login: 'author2',
          name: 'author2',
          is_bot: true,
        },
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-04T00:00:00Z',
        state: 'closed',
      },
    ];

    it('should successfully fetch PR list', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockApiPRListData),
        stderr: '',
      });

      const result = await fetchPRList('owner/repo');

      expect(result).toEqual(mockPRListData);
      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'api',
        'repos/owner/repo/pulls?per_page=100&page=1&state=open',
      ]);
    });

    it('should pass page and limit options', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockApiPRListData),
        stderr: '',
      });

      await fetchPRList('owner/repo', { page: 2, limit: 50 });

      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'api',
        'repos/owner/repo/pulls?per_page=50&page=2&state=open',
      ]);
    });

    it('should clamp invalid page and limit values', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockApiPRListData),
        stderr: '',
      });

      await fetchPRList('owner/repo', { page: 0, limit: 250 });

      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'api',
        'repos/owner/repo/pulls?per_page=100&page=1&state=open',
      ]);
    });

    it('should pass state=closed option', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockApiPRListData),
        stderr: '',
      });

      await fetchPRList('owner/repo', { state: 'closed' });

      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'api',
        'repos/owner/repo/pulls?per_page=100&page=1&state=closed',
      ]);
    });

    it('should pass state=all option', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockApiPRListData),
        stderr: '',
      });

      await fetchPRList('owner/repo', { state: 'all' });

      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'api',
        'repos/owner/repo/pulls?per_page=100&page=1&state=all',
      ]);
    });

    it('should default to state=open for invalid state value', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockApiPRListData),
        stderr: '',
      });

      await fetchPRList('owner/repo', { state: 'invalid' as never });

      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'api',
        'repos/owner/repo/pulls?per_page=100&page=1&state=open',
      ]);
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
          inlineComments: [],
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
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: JSON.stringify(mockPRDetailData),
          stderr: '',
        })
        .mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: '' });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result).toEqual(mockPRDetailData);
      expect(mockExecAsync).toHaveBeenCalledWith('gh', [
        'pr',
        'view',
        '1',
        '--repo',
        'owner/repo',
        '--json',
        'number,title,body,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
      ]);
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

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(emptyDetailData),
        stderr: '',
      });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result.comments).toEqual([]);
      expect(result.reviews).toEqual([]);
      expect(result.commits).toEqual([]);
    });

    it('should map review author login to id and name when id/name are absent', async () => {
      const ghOutput = {
        number: 1,
        title: 'Test PR',
        body: null,
        assignees: [],
        author: { login: 'author1' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'OPEN',
        comments: [
          {
            id: 'IC_1',
            author: { login: 'commenter1' },
            body: 'Nice change!',
            createdAt: '2024-01-01T10:00:00Z',
          },
        ],
        reviews: [
          {
            id: 'PRR_1',
            author: { login: 'reviewer1' },
            state: 'COMMENTED',
            body: '',
            submittedAt: '2024-01-01T11:00:00Z',
          },
        ],
        commits: [],
      };
      const ghReviewsList = [{ id: 101, node_id: 'PRR_1' }];
      mockExecAsync.mockImplementation((_cmd: string, args: string[]) => {
        const path = args.join(' ');
        if (path.includes('pr view')) {
          return Promise.resolve({
            stdout: JSON.stringify(ghOutput),
            stderr: '',
          });
        }
        if (path.includes('/reviews') && !path.includes('/comments')) {
          return Promise.resolve({
            stdout: JSON.stringify(ghReviewsList),
            stderr: '',
          });
        }
        return Promise.resolve({ stdout: JSON.stringify([]), stderr: '' });
      });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result.author.id).toBe('author1');
      expect(result.author.name).toBe('author1');
      expect(result.reviews[0].author.id).toBe('reviewer1');
      expect(result.reviews[0].author.name).toBe('reviewer1');
      expect(result.comments[0].author.id).toBe('commenter1');
      expect(result.comments[0].author.name).toBe('commenter1');
    });

    it('should include inline comments in reviews', async () => {
      const ghOutput = {
        number: 1,
        title: 'Test PR',
        body: 'PR description',
        assignees: [],
        author: { id: 'U_123', login: 'author1', name: 'Author One' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'OPEN',
        comments: [],
        reviews: [
          {
            id: 'PRR_1',
            author: { login: 'reviewer1' },
            state: 'COMMENTED',
            body: '',
            submittedAt: '2024-01-01T11:00:00Z',
          },
        ],
        commits: [],
      };
      const ghReviewsList = [{ id: 101, node_id: 'PRR_1' }];
      const ghInlineComments = [
        {
          id: 9001,
          node_id: 'PRRC_1',
          user: {
            login: 'reviewer1',
            id: 56902,
            node_id: 'MDQ6',
            type: 'User',
          },
          body: 'Nit: rename this variable.',
          path: 'src/index.ts',
          diff_hunk: '@@ -1,3 +1,4 @@',
          created_at: '2024-01-01T11:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
        },
      ];
      mockExecAsync.mockImplementation((_cmd: string, args: string[]) => {
        const path = args.join(' ');
        if (path.includes('pr view')) {
          return Promise.resolve({
            stdout: JSON.stringify(ghOutput),
            stderr: '',
          });
        }
        if (path.includes('/reviews') && !path.includes('/comments')) {
          return Promise.resolve({
            stdout: JSON.stringify(ghReviewsList),
            stderr: '',
          });
        }
        // review comments endpoint
        return Promise.resolve({
          stdout: JSON.stringify(ghInlineComments),
          stderr: '',
        });
      });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result.reviews[0].inlineComments).toHaveLength(1);
      expect(result.reviews[0].inlineComments[0].body).toBe(
        'Nit: rename this variable.'
      );
      expect(result.reviews[0].inlineComments[0].path).toBe('src/index.ts');
      expect(result.reviews[0].inlineComments[0].diffHunk).toBe(
        '@@ -1,3 +1,4 @@'
      );
      expect(result.reviews[0].inlineComments[0].author.login).toBe(
        'reviewer1'
      );
    });
  });
});
