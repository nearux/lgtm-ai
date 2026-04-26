import { describe, it, expect } from 'vitest';
import { PRListItemDto } from './pull-requests.dto.js';
import type { PrListQuery } from '../../../graphql/generated/graphql.js';

type GraphQLPRNode = NonNullable<
  NonNullable<PrListQuery['repository']>['pullRequests']['nodes']
>[number];

describe('PRListItemDto.fromGraphQL', () => {
  const baseNode: GraphQLPRNode = {
    number: 42,
    title: 'My PR',
    body: 'Description',
    state: 'OPEN',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    totalCommentsCount: 10,
    assignees: {
      nodes: [{ id: 'U_1', login: 'alice', name: 'Alice' }],
    },
    author: {
      __typename: 'User',
      id: 'U_99',
      login: 'bob',
      name: 'Bob',
      avatarUrl: 'https://avatars.githubusercontent.com/u/99',
    },
  };

  it('maps number, title, body, state, dates', () => {
    const dto = PRListItemDto.fromGraphQL(baseNode);
    expect(dto.number).toBe(42);
    expect(dto.title).toBe('My PR');
    expect(dto.body).toBe('Description');
    expect(dto.state).toBe('OPEN');
    expect(dto.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(dto.updatedAt).toBe('2024-01-02T00:00:00Z');
  });

  it('maps totalCommentsCount from GraphQL', () => {
    const dto = PRListItemDto.fromGraphQL(baseNode);
    expect(dto.totalCommentsCount).toBe(10);
  });

  it('maps assignees', () => {
    const dto = PRListItemDto.fromGraphQL(baseNode);
    expect(dto.assignees).toEqual([
      { id: 'U_1', login: 'alice', name: 'Alice' },
    ]);
  });

  it('maps author with id, login, name, avatarUrl', () => {
    const dto = PRListItemDto.fromGraphQL(baseNode);
    expect(dto.author).toEqual({
      id: 'U_99',
      login: 'bob',
      name: 'Bob',
      avatarUrl: 'https://avatars.githubusercontent.com/u/99',
    });
  });

  it('falls back to login when author id is absent', () => {
    const node: GraphQLPRNode = {
      ...baseNode,
      author: {
        __typename: 'Mannequin',
        login: 'charlie',
        avatarUrl: 'https://example.com/avatar',
      },
    };
    const dto = PRListItemDto.fromGraphQL(node);
    expect(dto.author.id).toBe('charlie');
    expect(dto.author.name).toBe('charlie');
  });

  it('falls back to empty string when body is null', () => {
    const node = { ...baseNode, body: null };
    const dto = PRListItemDto.fromGraphQL(node);
    expect(dto.body).toBe('');
  });

  it('falls back to login when assignee name is null', () => {
    const node: GraphQLPRNode = {
      ...baseNode,
      assignees: { nodes: [{ id: 'U_2', login: 'dave', name: null }] },
    };
    const dto = PRListItemDto.fromGraphQL(node);
    expect(dto.assignees[0].name).toBe('dave');
  });
});
