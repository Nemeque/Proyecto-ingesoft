/**
 * Cliente HTTP central para hablar con el backend de Django (LibreChoice).
 * Maneja la URL base, el token JWT (access/refresh) y el refresco automático
 * cuando el access token expira.
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const ACCESS_KEY = "librechoice_access";
const REFRESH_KEY = "librechoice_refresh";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  setTokens(data.access, data.refresh);
  return data.access as string;
}

interface RequestOptions extends RequestInit {
  auth?: boolean; // adjunta el Bearer token (por defecto true)
}

/** Petición genérica con manejo de JSON, auth y refresh automático de token. */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json", ...(headers as any) };
    if (auth) {
      const token = getAccessToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  let res = await fetch(`${API_URL}${path}`, { ...rest, headers: buildHeaders() });

  if (res.status === 401 && auth && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await fetch(`${API_URL}${path}`, { ...rest, headers: buildHeaders() });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data && (data.detail || data.error || Object.values(data)?.[0])) ||
      `Error ${res.status}`;
    throw new ApiError(Array.isArray(message) ? message[0] : String(message), res.status, data);
  }

  return data as T;
}

/** Extrae los `results` de una respuesta paginada de DRF, o el array tal cual. */
export function unwrapResults<T>(payload: T[] | { results: T[] }): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}
