import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PRListItem, PRDetail } from '../types/pullRequests.js';

// Create mock function at the top level using vi.hoisted
const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

// Import after mocks are set up
const {
  fetchPRList,
  fetchPRDetail,
  checkoutPRBranch,
  buildReviewIdMap,
  mapGhError,
} = await import('./pullRequests.js');

describe('pullRequests service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPRList', () => {
    const mockGraphQLNodes = [
      {
        number: 1,
        title: 'Test PR',
        body: 'Test body',
        state: 'OPEN',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        comments: { totalCount: 3 },
        reviewThreads: { totalCount: 5 },
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
        comments: { totalCount: 0 },
        reviewThreads: { totalCount: 2 },
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
        commentsCount: 3,
        reviewCommentsCount: 5,
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
        commentsCount: 0,
        reviewCommentsCount: 2,
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
          data: {
            repository: {
              pullRequests: { totalCount, nodes },
            },
          },
        }),
        stderr: '',
      });
    }

    function mockGraphQLCursorResponse(endCursor: string) {
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          data: {
            repository: {
              pullRequests: { pageInfo: { endCursor } },
            },
          },
        }),
        stderr: '',
      });
    }

    it('should successfully fetch PR list (page 1 — single GraphQL call)', async () => {
      mockGraphQLDataResponse(2);

      const result = await fetchPRList('owner/repo');

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
      mockGraphQLCursorResponse('cursor_abc');
      mockGraphQLDataResponse(150);

      await fetchPRList('owner/repo', { page: 2, limit: 50 });

      expect(mockExecAsync).toHaveBeenCalledTimes(2);
      // First call: cursor resolution for skip=50
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
      // Second call: data fetch with cursor
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

    it('should calculate lastPage from totalCount', async () => {
      mockGraphQLDataResponse(250);

      const result = await fetchPRList('owner/repo', { limit: 50 });

      expect(result.lastPage).toBe(5);
    });

    it('should return lastPage 1 when totalCount is 0', async () => {
      mockGraphQLDataResponse(0, []);

      const result = await fetchPRList('owner/repo');

      expect(result).toEqual({ items: [], lastPage: 1 });
    });

    it('should pass state=open via GraphQL states filter', async () => {
      mockGraphQLDataResponse(2);

      await fetchPRList('owner/repo', { state: 'open' });

      expect(mockExecAsync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['-f', 'states[]=OPEN'])
      );
    });

    it('should pass state=closed via GraphQL states filter', async () => {
      mockGraphQLDataResponse(2);

      await fetchPRList('owner/repo', { state: 'closed' });

      const args: string[] = mockExecAsync.mock.calls[0][1];
      const statesArgs = args.filter(
        (_, i) => args[i - 1] === '-f' && args[i].startsWith('states[]=')
      );
      expect(statesArgs).toEqual(['states[]=CLOSED', 'states[]=MERGED']);
    });

    it('should pass state=all via GraphQL states filter', async () => {
      mockGraphQLDataResponse(2);

      await fetchPRList('owner/repo', { state: 'all' });

      const args: string[] = mockExecAsync.mock.calls[0][1];
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
      mockGraphQLDataResponse(2);

      await fetchPRList('owner/repo', { state: 'invalid' as never });

      expect(mockExecAsync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['-f', 'states[]=OPEN'])
      );
    });

    it('should clamp invalid page and limit values', async () => {
      mockGraphQLDataResponse(2);

      await fetchPRList('owner/repo', { page: 0, limit: 250 });

      // limit clamped to 100, page clamped to 1 → no cursor call
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
      mockExecAsync.mockRejectedValue(
        new Error('authentication required: gh auth login')
      );

      await expect(fetchPRList('owner/repo')).rejects.toMatchObject({
        message:
          'GitHub CLI is not authenticated. Please check your account in the header.',
        statusCode: 503,
      });
    });

    it('should throw FORBIDDEN error for not found', async () => {
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

    it('should throw INTERNAL_SERVER_ERROR when GraphQL response has errors', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          errors: [{ message: 'Field does not exist' }],
        }),
        stderr: '',
      });

      await expect(fetchPRList('owner/repo')).rejects.toMatchObject({
        message: 'Failed to fetch PR data from GitHub',
        statusCode: 500,
      });
    });

    it('should return empty result when page is out of bounds (cursor is null)', async () => {
      // Cursor resolution returns null when skip >= totalCount
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({
          data: {
            repository: {
              pullRequests: { pageInfo: { endCursor: null } },
            },
          },
        }),
        stderr: '',
      });

      const result = await fetchPRList('owner/repo', { page: 999, limit: 10 });

      expect(result).toEqual({ items: [], lastPage: 1 });
      expect(mockExecAsync).toHaveBeenCalledTimes(1); // only cursor call, no data call
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

      mockExecAsync
        .mockResolvedValueOnce({
          stdout: JSON.stringify(emptyDetailData),
          stderr: '',
        })
        .mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: '' }); // pulls/comments

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
      // pull_request_review_id links the comment to review with numeric id 101
      const ghInlineComments = [
        {
          id: 9001,
          node_id: 'PRRC_1',
          pull_request_review_id: 101,
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
        // node_id → numeric id resolution: pulls/{pr}/reviews
        if (path.includes('/reviews') && !path.includes('/comments')) {
          return Promise.resolve({
            stdout: JSON.stringify(ghReviewsList),
            stderr: '',
          });
        }
        // single pulls/{pr}/comments endpoint (replaces N per-review calls)
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

    it('uses a single pulls/comments call regardless of review count (no N+1)', async () => {
      const ghOutput = {
        number: 1,
        title: 'Test PR',
        body: '',
        assignees: [],
        author: { login: 'author1' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'OPEN',
        comments: [],
        reviews: [
          {
            id: 'PRR_1',
            author: { login: 'r1' },
            state: 'COMMENTED',
            body: '',
            submittedAt: '2024-01-01T11:00:00Z',
          },
          {
            id: 'PRR_2',
            author: { login: 'r2' },
            state: 'APPROVED',
            body: 'LGTM',
            submittedAt: '2024-01-01T12:00:00Z',
          },
          {
            id: 'PRR_3',
            author: { login: 'r3' },
            state: 'CHANGES_REQUESTED',
            body: '',
            submittedAt: '2024-01-01T13:00:00Z',
          },
        ],
        commits: [],
      };
      const ghReviewsList = [
        { id: 101, node_id: 'PRR_1' },
        { id: 102, node_id: 'PRR_2' },
        { id: 103, node_id: 'PRR_3' },
      ];
      const calls: string[][] = [];
      mockExecAsync.mockImplementation((_cmd: string, args: string[]) => {
        calls.push(args);
        const path = args.join(' ');
        if (path.includes('pr view'))
          return Promise.resolve({
            stdout: JSON.stringify(ghOutput),
            stderr: '',
          });
        if (path.includes('/reviews') && !path.includes('/comments'))
          return Promise.resolve({
            stdout: JSON.stringify(ghReviewsList),
            stderr: '',
          });
        return Promise.resolve({ stdout: JSON.stringify([]), stderr: '' });
      });

      await fetchPRDetail('owner/repo', 1);

      const commentsCalls = calls.filter((args) =>
        args.join(' ').includes('/comments')
      );
      // exactly 1 call to pulls/{pr}/comments — not 3 (one per review)
      expect(commentsCalls).toHaveLength(1);
      expect(commentsCalls[0].join(' ')).toContain(
        'repos/owner/repo/pulls/1/comments'
      );
    });

    it('groups inline comments from pulls/comments by pull_request_review_id', async () => {
      const ghOutput = {
        number: 1,
        title: 'Test PR',
        body: '',
        assignees: [],
        author: { login: 'author1' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'OPEN',
        comments: [],
        reviews: [
          {
            id: 'PRR_1',
            author: { login: 'r1' },
            state: 'COMMENTED',
            body: '',
            submittedAt: '2024-01-01T11:00:00Z',
          },
          {
            id: 'PRR_2',
            author: { login: 'r2' },
            state: 'COMMENTED',
            body: '',
            submittedAt: '2024-01-01T12:00:00Z',
          },
        ],
        commits: [],
      };
      const ghReviewsList = [
        { id: 101, node_id: 'PRR_1' },
        { id: 102, node_id: 'PRR_2' },
      ];
      const allPrComments = [
        {
          id: 1,
          node_id: 'PRRC_1',
          pull_request_review_id: 101,
          user: { login: 'r1', id: 1, node_id: 'U_1', type: 'User' },
          body: 'Comment on review 1',
          path: 'a.ts',
          diff_hunk: '@@ -1 +1 @@',
          created_at: '2024-01-01T11:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
        },
        {
          id: 2,
          node_id: 'PRRC_2',
          pull_request_review_id: 102,
          user: { login: 'r2', id: 2, node_id: 'U_2', type: 'User' },
          body: 'Comment on review 2',
          path: 'b.ts',
          diff_hunk: '@@ -2 +2 @@',
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        },
        {
          id: 3,
          node_id: 'PRRC_3',
          pull_request_review_id: 101,
          user: { login: 'r1', id: 1, node_id: 'U_1', type: 'User' },
          body: 'Second comment on review 1',
          path: 'a.ts',
          diff_hunk: '@@ -5 +5 @@',
          created_at: '2024-01-01T11:30:00Z',
          updated_at: '2024-01-01T11:30:00Z',
        },
      ];
      mockExecAsync.mockImplementation((_cmd: string, args: string[]) => {
        const path = args.join(' ');
        if (path.includes('pr view'))
          return Promise.resolve({
            stdout: JSON.stringify(ghOutput),
            stderr: '',
          });
        if (path.includes('/reviews') && !path.includes('/comments'))
          return Promise.resolve({
            stdout: JSON.stringify(ghReviewsList),
            stderr: '',
          });
        return Promise.resolve({
          stdout: JSON.stringify(allPrComments),
          stderr: '',
        });
      });

      const result = await fetchPRDetail('owner/repo', 1);

      expect(result.reviews[0].inlineComments).toHaveLength(2);
      expect(result.reviews[0].inlineComments[0].body).toBe(
        'Comment on review 1'
      );
      expect(result.reviews[0].inlineComments[1].body).toBe(
        'Second comment on review 1'
      );
      expect(result.reviews[1].inlineComments).toHaveLength(1);
      expect(result.reviews[1].inlineComments[0].body).toBe(
        'Comment on review 2'
      );
    });

    it('skips reviews list fetch when all review ids are numeric (no PRR_ node ids)', async () => {
      const ghOutput = {
        number: 1,
        title: 'Test PR',
        body: '',
        assignees: [],
        author: { login: 'author1' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        state: 'OPEN',
        comments: [],
        reviews: [
          {
            id: '42',
            author: { login: 'r1' },
            state: 'APPROVED',
            body: '',
            submittedAt: '2024-01-01T11:00:00Z',
          },
        ],
        commits: [],
      };
      const inlineComments = [
        {
          id: 9,
          node_id: 'PRRC_9',
          pull_request_review_id: 42,
          user: { login: 'r1', id: 1, node_id: 'U_1', type: 'User' },
          body: 'Inline nit',
          path: 'x.ts',
          diff_hunk: '@@ -1 +1 @@',
          created_at: '2024-01-01T11:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
        },
      ];
      const calls: string[][] = [];
      mockExecAsync.mockImplementation((_cmd: string, args: string[]) => {
        calls.push(args);
        const path = args.join(' ');
        if (path.includes('pr view'))
          return Promise.resolve({
            stdout: JSON.stringify(ghOutput),
            stderr: '',
          });
        return Promise.resolve({
          stdout: JSON.stringify(inlineComments),
          stderr: '',
        });
      });

      const result = await fetchPRDetail('owner/repo', 1);

      // no call to pulls/{pr}/reviews (node_id resolution not needed)
      const reviewsListCalls = calls.filter(
        (args) =>
          args.join(' ').includes('/reviews') &&
          !args.join(' ').includes('/comments')
      );
      expect(reviewsListCalls).toHaveLength(0);
      expect(result.reviews[0].inlineComments).toHaveLength(1);
      expect(result.reviews[0].inlineComments[0].body).toBe('Inline nit');
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

  describe('buildReviewIdMap', () => {
    it('maps numeric review IDs to themselves', () => {
      const reviewIds = ['111', '222'];
      const nodeIdMap = new Map<string, number>();
      const result = buildReviewIdMap(reviewIds, nodeIdMap);
      expect(result).toEqual(
        new Map([
          [111, '111'],
          [222, '222'],
        ])
      );
    });

    it('maps PRR_ node IDs via nodeIdToNumericId', () => {
      const reviewIds = ['PRR_abc', 'PRR_def'];
      const nodeIdMap = new Map([
        ['PRR_abc', 10],
        ['PRR_def', 20],
      ]);
      const result = buildReviewIdMap(reviewIds, nodeIdMap);
      expect(result).toEqual(
        new Map([
          [10, 'PRR_abc'],
          [20, 'PRR_def'],
        ])
      );
    });

    it('skips IDs that cannot be resolved', () => {
      const reviewIds = ['PRR_missing', '999'];
      const nodeIdMap = new Map<string, number>();
      const result = buildReviewIdMap(reviewIds, nodeIdMap);
      // PRR_missing has no entry in nodeIdMap → skipped
      expect(result).toEqual(new Map([[999, '999']]));
    });

    it('handles mixed numeric and PRR_ IDs', () => {
      const reviewIds = ['PRR_abc', '42'];
      const nodeIdMap = new Map([['PRR_abc', 7]]);
      const result = buildReviewIdMap(reviewIds, nodeIdMap);
      expect(result).toEqual(
        new Map([
          [7, 'PRR_abc'],
          [42, '42'],
        ])
      );
    });
  });

  describe('mapGhError', () => {
    describe("context: 'fetch'", () => {
      it('returns SERVICE_UNAVAILABLE for authentication errors', () => {
        const err = new Error('authentication failed');
        const result = mapGhError(err, 'fetch');
        expect(result.statusCode).toBe(503);
        expect(result.message).toContain('not authenticated');
      });

      it('returns FORBIDDEN for not found errors', () => {
        const err = new Error('repository not found');
        const result = mapGhError(err, 'fetch');
        expect(result.statusCode).toBe(403);
        expect(result.message).toContain('Cannot access');
      });

      it('returns FORBIDDEN for could not resolve errors', () => {
        const err = new Error('could not resolve repository');
        const result = mapGhError(err, 'fetch');
        expect(result.statusCode).toBe(403);
        expect(result.message).toContain('Cannot access');
      });

      it('returns INTERNAL_SERVER_ERROR for unknown errors', () => {
        const err = new Error('something unexpected');
        const result = mapGhError(err, 'fetch');
        expect(result.statusCode).toBe(500);
        expect(result.message).toContain('Failed to fetch');
      });

      it('handles non-Error objects', () => {
        const result = mapGhError('plain string error', 'fetch');
        expect(result.statusCode).toBe(500);
      });
    });

    describe("context: 'checkout'", () => {
      it('returns NOT_FOUND for could not resolve errors', () => {
        const err = new Error('could not resolve pull request');
        const result = mapGhError(err, 'checkout');
        expect(result.statusCode).toBe(404);
        expect(result.message).toContain('not found');
      });

      it('returns SERVICE_UNAVAILABLE for authentication errors', () => {
        const err = new Error('authentication required');
        const result = mapGhError(err, 'checkout');
        expect(result.statusCode).toBe(503);
        expect(result.message).toContain('not authenticated');
      });

      it('returns INTERNAL_SERVER_ERROR for unknown errors', () => {
        const err = new Error('unexpected failure');
        const result = mapGhError(err, 'checkout');
        expect(result.statusCode).toBe(500);
        expect(result.message).toContain('Failed to checkout');
      });
    });
  });
});
