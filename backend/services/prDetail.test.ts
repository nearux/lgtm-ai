import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PRDetail } from '../types/pullRequests.js';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

const { fetchPRDetail, buildReviewIdMap } = await import('./prDetail.js');

describe('fetchPRDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      .mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: '' });

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
        pull_request_review_id: 101,
        user: { login: 'reviewer1', id: 56902, node_id: 'MDQ6', type: 'User' },
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
    expect(result.reviews[0].inlineComments[0].author.login).toBe('reviewer1');
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

describe('buildReviewIdMap', () => {
  it('maps numeric review IDs to themselves', () => {
    const result = buildReviewIdMap(['111', '222'], new Map());
    expect(result).toEqual(
      new Map([
        [111, '111'],
        [222, '222'],
      ])
    );
  });

  it('maps PRR_ node IDs via nodeIdToNumericId', () => {
    const result = buildReviewIdMap(
      ['PRR_abc', 'PRR_def'],
      new Map([
        ['PRR_abc', 10],
        ['PRR_def', 20],
      ])
    );
    expect(result).toEqual(
      new Map([
        [10, 'PRR_abc'],
        [20, 'PRR_def'],
      ])
    );
  });

  it('skips IDs that cannot be resolved', () => {
    const result = buildReviewIdMap(['PRR_missing', '999'], new Map());
    expect(result).toEqual(new Map([[999, '999']]));
  });

  it('handles mixed numeric and PRR_ IDs', () => {
    const result = buildReviewIdMap(
      ['PRR_abc', '42'],
      new Map([['PRR_abc', 7]])
    );
    expect(result).toEqual(
      new Map([
        [7, 'PRR_abc'],
        [42, '42'],
      ])
    );
  });
});
