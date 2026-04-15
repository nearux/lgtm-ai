import type { ErrorResponse } from '@lgtmai/backend/types';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const error: ErrorResponse = await response.json();
      message = error.message;
    } catch {
      // Use statusText if JSON parsing fails
    }
    throw new ApiClientError(message, response.status, response.statusText);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  return handleResponse<T>(response);
};

export const apiPost = async <T, B>(path: string, body: B): Promise<T> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

export const apiPatch = async <T, B>(path: string, body: B): Promise<T> => {
  const response = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
};

export const apiDelete = async (path: string): Promise<void> => {
  const response = await fetch(path, { method: 'DELETE' });
  return handleResponse<void>(response);
};
