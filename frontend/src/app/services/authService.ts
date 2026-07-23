import type { RegisterData, User } from "../data/mockUser";
import { apiFetch, clearTokens, setTokens } from "./api";
import { clearUserCourseState, loadUserCourseState } from "./courseService";

/** Forma cruda que devuelve `UserSerializer` en el backend. */
interface BackendUser {
  id: number;
  name: string;
  email: string;
  carrera: string | null;
  facultad: string | null;
  semestre: number | null;
  student_code: string | null;
  bio: string;
  avatar_url: string;
  intereses: string[];
  is_staff: boolean;
}

async function toFrontendUser(raw: BackendUser): Promise<User> {
  const [favorites, ratings, viewed] = await Promise.all([
    apiFetch<string[]>("/users/me/favorites").catch(() => []),
    apiFetch<Record<string, number>>("/users/me/ratings").catch(() => ({})),
    apiFetch<string[]>("/users/me/view-history").catch(() => []),
  ]);

  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    carrera: raw.carrera ?? "",
    facultad: raw.facultad ?? "",
    semestre: raw.semestre ?? 1,
    intereses: raw.intereses ?? [],
    myList: favorites.map(String),
    viewedCourses: viewed.map(String),
    ratedCourses: Object.entries(ratings).map(([courseId, rating]) => ({ courseId, rating })),
    isStaff: raw.is_staff ?? false,
  };
}

/** POST /api/auth/login */
export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<{ access: string; refresh: string; user: BackendUser }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }), auth: false }
  );
  setTokens(data.access, data.refresh);
  await loadUserCourseState();
  return toFrontendUser(data.user);
}

/** POST /api/auth/register */
export async function register(data: RegisterData): Promise<User> {
  await apiFetch<BackendUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
    auth: false,
  });
  // el registro no inicia sesión automáticamente en el backend: lo hacemos aquí
  return login(data.email, data.password);
}

/** POST /api/auth/logout */
export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
    clearUserCourseState();
  }
}

/** GET /api/auth/me */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const raw = await apiFetch<BackendUser>("/auth/me");
    await loadUserCourseState();
    return toFrontendUser(raw);
  } catch {
    return null;
  }
}

/** PATCH /api/auth/me */
export async function updateProfile(data: Partial<User>): Promise<User> {
  const payload: Record<string, unknown> = {};
  if (data.bio !== undefined) payload.bio = data.bio;
  if (data.semestre !== undefined) payload.semestre = data.semestre;
  if (data.intereses !== undefined) payload.intereses = data.intereses;
  if (data.carrera !== undefined) payload.carrera = data.carrera;
  const raw = await apiFetch<BackendUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return toFrontendUser(raw);
}
