import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PRListItem, PRDetail } from '../types/pullRequests.js';

// Create mock function at the top level using vi.hoisted
const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

// Import after mocks are set up
const { fetchPRList, fetchPRDetail, checkoutPRBranch } =
  await import('./pullRequests.js');

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
        comments: 3,
        review_comments: 5,
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
        comments: 0,
        review_comments: 2,
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
        commentsCount: 3,
        reviewCommentsCount: 5,
        assignees: [{ id: '1', login: 'user1', name: 'User One' }],
        author: {
          id: '2',
          login: 'author1',
          name: 'Author One',
          avatarUrl: 'https://avatars.githubusercontent.com/u/2',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'open',
      },
      {
        number: 2,
        title: 'Another PR',
        body: '',
        commentsCount: 0,
        reviewCommentsCount: 2,
        assignees: [],
        author: {
          id: '3',
          login: 'author2',
          name: 'author2',
          avatarUrl: 'https://avatars.githubusercontent.com/u/3',
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
      expect(mockExecAsync).toHaveBeenCalledTimes(1);
    });

    it('should default counts to 0 when GitHub fields are missing', async () => {
      const withoutCountFields = [
        {
          number: 3,
          title: 'No counts PR',
          body: 'Body',
          assignees: [],
          user: { id: 4, login: 'author3', name: 'Author Three', type: 'User' },
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-06T00:00:00Z',
          state: 'open',
        },
      ];

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(withoutCountFields),
        stderr: '',
      });
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ comments: 9, review_comments: 4 }),
        stderr: '',
      });

      const result = await fetchPRList('owner/repo');

      expect(result[0].commentsCount).toBe(9);
      expect(result[0].reviewCommentsCount).toBe(4);
    });

    it('should default counts to 0 when GitHub fields are null', async () => {
      const nullCountFields = [
        {
          number: 4,
          title: 'Null counts PR',
          body: 'Body',
          comments: null,
          review_comments: null,
          assignees: [],
          user: { id: 5, login: 'author4', name: 'Author Four', type: 'User' },
          created_at: '2024-01-07T00:00:00Z',
          updated_at: '2024-01-08T00:00:00Z',
          state: 'open',
        },
      ];

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(nullCountFields),
        stderr: '',
      });
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ comments: 6, review_comments: 2 }),
        stderr: '',
      });

      const result = await fetchPRList('owner/repo');

      expect(result[0].commentsCount).toBe(6);
      expect(result[0].reviewCommentsCount).toBe(2);
    });

    it('should fallback to 0 when detail lookup for missing counts fails', async () => {
      const withoutCountFields = [
        {
          number: 5,
          title: 'Missing counts PR',
          body: 'Body',
          assignees: [],
          user: { id: 6, login: 'author5', name: 'Author Five', type: 'User' },
          created_at: '2024-01-09T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z',
          state: 'open',
        },
      ];

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(withoutCountFields),
        stderr: '',
      });
      mockExecAsync.mockRejectedValueOnce(new Error('detail lookup failed'));

      const result = await fetchPRList('owner/repo');

      expect(result[0].commentsCount).toBe(0);
      expect(result[0].reviewCommentsCount).toBe(0);
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
        message:
          'GitHub CLI is not authenticated. Please check your account in the header.',
        statusCode: 503,
      });
    });

    it('should throw FORBIDDEN error for not found (private repo access)', async () => {
      mockExecAsync.mockRejectedValue(new Error('Not Found'));

      await expect(fetchPRList('owner/repo')).rejects.toMatchObject({
        message:
          'Cannot access this repository. Try switching your GitHub account in the header.',
        statusCode: 403,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR for general failures', async () => {
      mockExecAsync.mockRejectedValue(new Error('Network error'));

      await expect(fetchPRList('owner/repo')).rejects.toMatchObject({
        message: 'Failed to fetch PR data from GitHub',
        statusCode: 500,
      });
    });

    it('should throw BAD_REQUEST for invalid repo name', async () => {
      await expect(fetchPRList('invalid repo name!')).rejects.toMatchObject({
        message: 'Invalid repository name',
        statusCode: 400,
      });
    });
  });

  describe('fetchPRDetail', () => {
    const mockPRDetailData: PRDetail = {
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      commentsCount: 1,
      reviewCommentsCount: 0,
      baseBranch: 'main',
      headBranch: 'feature/test',
      assignees: [{ id: '1', login: 'user1', name: 'User One' }],
      author: {
        id: '2',
        login: 'author1',
        name: 'Author One',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      state: 'OPEN',
      comments: [
        {
          id: 'c1',
          author: {
            id: '3',
            login: 'reviewer1',
            name: 'Reviewer One',
            avatarUrl: 'https://avatars.githubusercontent.com/u/3',
          },
          body: 'Looks good!',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
      reviews: [
        {
          id: 'r1',
          author: {
            id: '3',
            login: 'reviewer1',
            name: 'Reviewer One',
            avatarUrl: 'https://avatars.githubusercontent.com/u/3',
          },
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
    // Raw GH response shape — includes baseRefName/headRefName instead of baseBranch/headBranch
    const mockGhPRDetailData = {
      ...mockPRDetailData,
      baseRefName: 'main',
      headRefName: 'feature/test',
    };

    it('should successfully fetch PR detail', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: JSON.stringify(mockGhPRDetailData),
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
        'number,title,body,baseRefName,headRefName,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
      ]);
    });

    it('should throw FORBIDDEN error when PR could not be resolved', async () => {
      mockExecAsync.mockRejectedValue(
        new Error('could not resolve to a PullRequest')
      );

      await expect(fetchPRDetail('owner/repo', 999)).rejects.toMatchObject({
        message:
          'Cannot access this repository. Try switching your GitHub account in the header.',
        statusCode: 403,
      });
    });

    it('should throw SERVICE_UNAVAILABLE error for authentication failure', async () => {
      mockExecAsync.mockRejectedValue(
        new Error('authentication required: gh auth login')
      );

      await expect(fetchPRDetail('owner/repo', 1)).rejects.toMatchObject({
        message:
          'GitHub CLI is not authenticated. Please check your account in the header.',
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
      const emptyDetailData = {
        ...mockGhPRDetailData,
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

  describe('checkoutPRBranch', () => {
    it('should checkout PR branch when working tree is clean', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // gh pr checkout
        .mockResolvedValueOnce({
          stdout: 'feature/awesome-change\n',
          stderr: '',
        }); // git branch --show-current

      const result = await checkoutPRBranch('owner/repo', 23, '/repo', {
        force: false,
      });

      expect(result).toEqual({
        success: true,
        message: 'Checked out PR branch successfully',
        targetBranch: 'feature/awesome-change',
        stashed: false,
      });
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        1,
        'git',
        ['status', '--porcelain', '--untracked-files=normal'],
        { cwd: '/repo' }
      );
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        2,
        'gh',
        ['pr', 'checkout', '23', '--repo', 'owner/repo'],
        { cwd: '/repo' }
      );
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        3,
        'git',
        ['branch', '--show-current'],
        { cwd: '/repo' }
      );
    });

    it('should throw CONFLICT when working tree is dirty and force is false', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: ' M backend/services/pullRequests.ts',
        stderr: '',
      }); // git status (dirty)

      await expect(
        checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
      ).rejects.toMatchObject({
        message:
          'Cannot checkout PR branch because local changes exist. Retry with force=true to auto-stash.',
        statusCode: 409,
      });

      expect(mockExecAsync).toHaveBeenCalledTimes(1);
    });

    it('should stash including untracked files when force is true', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: ' M backend/services/pullRequests.ts\n?? new-file.txt',
          stderr: '',
        }) // git status (dirty)
        .mockResolvedValueOnce({
          stdout: 'Saved working directory...',
          stderr: '',
        }) // git stash push
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // gh pr checkout
        .mockResolvedValueOnce({
          stdout: 'feature/awesome-change\n',
          stderr: '',
        }); // git branch --show-current

      const result = await checkoutPRBranch('owner/repo', 23, '/repo', {
        force: true,
      });

      expect(result).toEqual({
        success: true,
        message: 'Checked out PR branch successfully',
        targetBranch: 'feature/awesome-change',
        stashed: true,
      });
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        2,
        'git',
        [
          'stash',
          'push',
          '--include-untracked',
          '-m',
          'lgtmai: auto-stash before PR #23 checkout',
        ],
        { cwd: '/repo' }
      );
      expect(mockExecAsync).toHaveBeenNthCalledWith(
        3,
        'gh',
        ['pr', 'checkout', '23', '--repo', 'owner/repo'],
        { cwd: '/repo' }
      );
    });

    it('should throw INTERNAL_SERVER_ERROR when stash fails', async () => {
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: ' M file.ts',
          stderr: '',
        }) // git status (dirty)
        .mockRejectedValueOnce(new Error('stash failed')); // git stash push

      await expect(
        checkoutPRBranch('owner/repo', 23, '/repo', { force: true })
      ).rejects.toMatchObject({
        message: 'Failed to stash local changes before checkout',
        statusCode: 500,
      });
    });

    it('should throw NOT_FOUND when PR does not exist', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
        .mockRejectedValueOnce(new Error('could not resolve to a PullRequest')); // gh pr checkout

      await expect(
        checkoutPRBranch('owner/repo', 999, '/repo', { force: false })
      ).rejects.toMatchObject({
        message: 'Pull request not found',
        statusCode: 404,
      });
    });

    it('should throw SERVICE_UNAVAILABLE for gh authentication failure', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
        .mockRejectedValueOnce(
          new Error('authentication required: gh auth login')
        ); // gh pr checkout

      await expect(
        checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
      ).rejects.toMatchObject({
        message: 'GitHub CLI is not available or authenticated',
        statusCode: 503,
      });
    });

    it('should throw INTERNAL_SERVER_ERROR for general checkout failure', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
        .mockRejectedValueOnce(new Error('unexpected error')); // gh pr checkout

      await expect(
        checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
      ).rejects.toMatchObject({
        message: 'Failed to checkout PR branch',
        statusCode: 500,
      });
    });

    it('should throw BAD_REQUEST for invalid repo name', async () => {
      await expect(
        checkoutPRBranch('bad repo!', 23, '/repo', { force: false })
      ).rejects.toMatchObject({
        message: 'Invalid repository name',
        statusCode: 400,
      });
    });
  });
});
