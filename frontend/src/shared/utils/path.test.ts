import { describe, it, expect } from 'vitest';
import { parsePathSegments, buildPathFromSegments } from './path';

describe('parsePathSegments', () => {
  it('splits path into segments', () => {
    expect(parsePathSegments('/Users/pmh/projects')).toEqual([
      'Users',
      'pmh',
      'projects',
    ]);
  });

  it('handles root path', () => {
    expect(parsePathSegments('/')).toEqual([]);
  });

  it('handles path without leading slash', () => {
    expect(parsePathSegments('Users/pmh')).toEqual(['Users', 'pmh']);
  });

  it('filters out empty segments from double slashes', () => {
    expect(parsePathSegments('/Users//pmh')).toEqual(['Users', 'pmh']);
  });
});

describe('buildPathFromSegments', () => {
  const segments = ['Users', 'pmh', 'projects'];

  it('builds path up to given index', () => {
    expect(buildPathFromSegments(segments, 0)).toBe('/Users');
    expect(buildPathFromSegments(segments, 1)).toBe('/Users/pmh');
    expect(buildPathFromSegments(segments, 2)).toBe('/Users/pmh/projects');
  });

  it('handles empty segments array', () => {
    expect(buildPathFromSegments([], 0)).toBe('/');
  });
});
