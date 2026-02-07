const API_BASE = '/api';

interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: ApiError,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('cgt_token');
}

function setToken(token: string): void {
  localStorage.setItem('cgt_token', token);
}

function removeToken(): void {
  localStorage.removeItem('cgt_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.location.href = '/login?expired=true';
    throw new ApiClientError('Unauthorized', 401, {
      error: 'UNAUTHORIZED',
      message: 'Session expired',
    });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({
      error: 'UNKNOWN',
      message: response.statusText,
    }));
    throw new ApiClientError(body.message || response.statusText, response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),

  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // Auth helpers
  getToken,
  setToken,
  removeToken,
};

export { ApiClientError };
export type { ApiError };
