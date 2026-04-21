import { describe, it, expect } from 'vitest';

const { validateRepoOwnerName, mapGhError, getErrorMessage } =
  await import('./gh.util.js');

describe('gh.util', () => {
  describe('validateRepoOwnerName', () => {
    it('accepts valid owner/repo format', () => {
      expect(() => validateRepoOwnerName('octocat/hello-world')).not.toThrow();
    });

    it('accepts names with dots and dashes', () => {
      expect(() => validateRepoOwnerName('my.org/my-repo.name')).not.toThrow();
    });

    it('throws BAD_REQUEST for missing slash', () => {
      expect(() => validateRepoOwnerName('noslash')).toThrow(
        expect.objectContaining({ statusCode: 400 }) as Error
      );
    });

    it('throws BAD_REQUEST for spaces', () => {
      expect(() => validateRepoOwnerName('bad repo name!')).toThrow(
        expect.objectContaining({ statusCode: 400 }) as Error
      );
    });

    it('throws BAD_REQUEST for empty string', () => {
      expect(() => validateRepoOwnerName('')).toThrow(
        expect.objectContaining({ statusCode: 400 }) as Error
      );
    });
  });

  describe('getErrorMessage', () => {
    it('returns message from Error instance', () => {
      expect(getErrorMessage(new Error('oops'))).toBe('oops');
    });

    it('converts non-Error to string', () => {
      expect(getErrorMessage('plain string')).toBe('plain string');
      expect(getErrorMessage(42)).toBe('42');
    });
  });

  describe('mapGhError', () => {
    describe("context: 'fetch'", () => {
      it('returns SERVICE_UNAVAILABLE for authentication errors', () => {
        const result = mapGhError(new Error('authentication failed'), 'fetch');
        expect(result.statusCode).toBe(503);
        expect(result.message).toContain('not authenticated');
      });

      it('returns FORBIDDEN for not found errors', () => {
        const result = mapGhError(new Error('repository not found'), 'fetch');
        expect(result.statusCode).toBe(403);
        expect(result.message).toContain('Cannot access');
      });

      it('returns FORBIDDEN for could not resolve errors', () => {
        const result = mapGhError(
          new Error('could not resolve repository'),
          'fetch'
        );
        expect(result.statusCode).toBe(403);
        expect(result.message).toContain('Cannot access');
      });

      it('returns INTERNAL_SERVER_ERROR for unknown errors', () => {
        const result = mapGhError(new Error('something unexpected'), 'fetch');
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
        const result = mapGhError(
          new Error('could not resolve pull request'),
          'checkout'
        );
        expect(result.statusCode).toBe(404);
        expect(result.message).toContain('not found');
      });

      it('returns SERVICE_UNAVAILABLE for authentication errors', () => {
        const result = mapGhError(
          new Error('authentication required'),
          'checkout'
        );
        expect(result.statusCode).toBe(503);
        expect(result.message).toContain('not authenticated');
      });

      it('returns INTERNAL_SERVER_ERROR for unknown errors', () => {
        const result = mapGhError(new Error('unexpected failure'), 'checkout');
        expect(result.statusCode).toBe(500);
        expect(result.message).toContain('Failed to checkout');
      });
    });
  });
});
