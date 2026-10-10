export class ApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

/** Small fetch wrapper: JSON in/out, same-origin cookies, errors carry the server's code for translation. */
export async function api<T>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  let data: { error?: string; code?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/inventory/login")) {
    window.location.href = "/inventory/login";
  }
  if (!res.ok) throw new ApiError(data?.error ?? "Request failed", data?.code, res.status);
  return data as T;
}
