import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}));

const { GhGraphQLClient } = await import('./gh-graphql.client.js');

describe('GhGraphQLClient.request', () => {
  let client: InstanceType<typeof GhGraphQLClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GhGraphQLClient();
  });

  function mockSuccess(data: unknown) {
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({ data }),
      stderr: '',
    });
  }

  function ghArgs(): string[] {
    return mockExecAsync.mock.calls[0][1] as string[];
  }

  it('passes query string as -f query=... argument', async () => {
    // given
    mockSuccess({ repository: null });

    // when
    await client.request('query { viewer { login } }', {});

    // then
    const args = ghArgs();
    expect(args).toContain('-f');
    expect(args[args.indexOf('-f') + 1]).toBe(
      'query=query { viewer { login } }'
    );
  });

  it('serializes string variable as -f key=value', async () => {
    // given
    mockSuccess({});

    // when
    await client.request(
      'query Q($owner: String!) { repository(owner: $owner) { id } }',
      {
        owner: 'octocat',
      }
    );

    // then
    const args = ghArgs();
    expect(args).toContain('owner=octocat');
    const flagIndex = args.indexOf('owner=octocat') - 1;
    expect(args[flagIndex]).toBe('-f');
  });

  it('serializes number variable as -F key=value', async () => {
    // given
    mockSuccess({});

    // when
    await client.request('query Q($limit: Int!) { node { id } }', {
      limit: 50,
    });

    // then
    const args = ghArgs();
    expect(args).toContain('limit=50');
    const flagIndex = args.indexOf('limit=50') - 1;
    expect(args[flagIndex]).toBe('-F');
  });

  it('serializes array variable as repeated -f key[]=value entries', async () => {
    // given
    mockSuccess({});

    // when
    await client.request('query Q($states: [IssueState!]) { node { id } }', {
      states: ['OPEN', 'CLOSED'],
    });

    // then
    const args = ghArgs();
    const statesArgs = args.filter(
      (_, i) => args[i - 1] === '-f' && args[i].startsWith('states[]=')
    );
    expect(statesArgs).toEqual(['states[]=OPEN', 'states[]=CLOSED']);
  });

  it('omits undefined variables from arguments', async () => {
    // given
    mockSuccess({});

    // when
    await client.request('query Q($after: String) { node { id } }', {
      after: undefined,
      owner: 'octocat',
    });

    // then
    const args = ghArgs();
    expect(args.some((a) => a.startsWith('after='))).toBe(false);
    expect(args).toContain('owner=octocat');
  });

  it('returns data from GraphQL response', async () => {
    // given
    const payload = { repository: { id: 'R_1', name: 'hello' } };
    mockSuccess(payload);

    // when
    const result = await client.request<typeof payload>(
      'query { node { id } }',
      {}
    );

    // then
    expect(result).toEqual(payload);
  });

  it('throws BAD_GATEWAY when GraphQL response contains errors', async () => {
    // given
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({ errors: [{ message: 'Field does not exist' }] }),
      stderr: '',
    });

    // when / then
    await expect(
      client.request('query { node { id } }', {})
    ).rejects.toMatchObject({
      message: 'GraphQL query failed: Field does not exist',
      statusCode: 502,
    });
  });

  it('throws BAD_GATEWAY with fallback message when errors array is empty', async () => {
    // given
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({ errors: [] }),
      stderr: '',
    });

    // when / then
    await expect(
      client.request('query { node { id } }', {})
    ).rejects.toMatchObject({
      message: 'GraphQL query failed: Unknown GraphQL error',
      statusCode: 502,
    });
  });

  it('throws BAD_GATEWAY when response has no data field', async () => {
    // given
    mockExecAsync.mockResolvedValueOnce({
      stdout: JSON.stringify({}),
      stderr: '',
    });

    // when / then
    await expect(
      client.request('query { node { id } }', {})
    ).rejects.toMatchObject({
      message: 'GraphQL query failed: Unknown GraphQL error',
      statusCode: 502,
    });
  });

  it('throws SERVICE_UNAVAILABLE when gh CLI reports authentication error', async () => {
    // given
    mockExecAsync.mockRejectedValueOnce(
      new Error('authentication required: gh auth login')
    );

    // when / then
    await expect(
      client.request('query { node { id } }', {})
    ).rejects.toMatchObject({
      message:
        'GitHub CLI is not authenticated. Please check your account in the header.',
      statusCode: 503,
    });
  });

  it('throws FORBIDDEN when gh CLI reports not found', async () => {
    // given
    mockExecAsync.mockRejectedValueOnce(new Error('not found'));

    // when / then
    await expect(
      client.request('query { node { id } }', {})
    ).rejects.toMatchObject({
      message:
        'Cannot access this repository. Try switching your GitHub account in the header.',
      statusCode: 403,
    });
  });

  it('throws INTERNAL_SERVER_ERROR for unknown gh CLI errors', async () => {
    // given
    mockExecAsync.mockRejectedValueOnce(new Error('network timeout'));

    // when / then
    await expect(
      client.request('query { node { id } }', {})
    ).rejects.toMatchObject({
      message: 'Failed to fetch PR data from GitHub',
      statusCode: 500,
    });
  });
});
