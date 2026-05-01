// MIN-10: interceptor catches `reason=sso_required` 401s from the auth
// guard and routes the user to the SSO entry point instead of showing
// a generic logged-out state.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const data = await res.clone().json().catch(() => ({}));
    if (data?.reason === 'sso_required') {
      window.location.href = '/login?reason=sso_required';
    }
  }

  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
  delete: <T,>(path: string) => request<T>('DELETE', path),
};
