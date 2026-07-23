import type { Course } from "../data/courses";
import { apiFetch, unwrapResults } from "./api";

// ── Caché local sincronizada con el servidor ──────────────────────────────
// CourseCard/CourseModal leen isFavorite()/getUserRating() de forma síncrona
// (igual que en la versión mock), así que mantenemos una caché en memoria que
// se llena al iniciar sesión y se actualiza en cada mutación.
let favoriteIds = new Set<string>();
let ratingsMap: Record<string, number> = {};

/** Debe llamarse tras iniciar sesión (o al recargar con un token guardado)
 * para poblar la caché local de favoritos/calificaciones del usuario. */
export async function loadUserCourseState(): Promise<void> {
  try {
    const [favorites, ratings] = await Promise.all([
      apiFetch<string[]>("/users/me/favorites"),
      apiFetch<Record<string, number>>("/users/me/ratings"),
    ]);
    favoriteIds = new Set(favorites.map(String));
    ratingsMap = ratings;
  } catch {
    favoriteIds = new Set();
    ratingsMap = {};
  }
}

export function clearUserCourseState(): void {
  favoriteIds = new Set();
  ratingsMap = {};
}

/** GET /api/courses */
export async function getCourses(): Promise<Course[]> {
  const data = await apiFetch<Course[] | { results: Course[] }>("/courses?limit=200");
  return unwrapResults(data);
}

/** GET /api/courses/:id */
export async function getCourseById(id: string): Promise<Course | null> {
  try {
    return await apiFetch<Course>(`/courses/${id}`);
  } catch {
    return null;
  }
}

/** POST /api/courses/:id/rate  { rating, comment?, is_anonymous? } */
export async function rateCourse(
  id: string,
  rating: number,
  options?: { comment?: string; isAnonymous?: boolean }
): Promise<Course> {
  const body: Record<string, unknown> = { rating };
  if (options?.comment !== undefined) body.comment = options.comment;
  if (options?.isAnonymous !== undefined) body.is_anonymous = options.isAnonymous;
  const course = await apiFetch<Course>(`/courses/${id}/rate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  ratingsMap[id] = rating;
  return course;
}

/** POST /api/courses/:id/popular  { popular: true|false }
 *  - Admin: toggle directo del flag.
 *  - Usuario normal: upvote (suma 1 a enrollment_count).
 *    Devuelve { id, popular, enrollment_count, message }. */
export async function togglePopular(
  id: string,
  popular: boolean
): Promise<{ id: string; popular: boolean; enrollment_count: number; message: string }> {
  return apiFetch(`/courses/${id}/popular`, {
    method: "POST",
    body: JSON.stringify({ popular }),
  });
}

/** DELETE /api/courses/:id/rate — quita tu propia calificación */
export async function removeRating(id: string): Promise<Course> {
  const course = await apiFetch<Course>(`/courses/${id}/rate`, { method: "DELETE" });
  delete ratingsMap[id];
  return course;
}

/** GET /api/users/me/favorites (ids) */
export async function getMyList(): Promise<string[]> {
  const ids = await apiFetch<string[]>("/users/me/favorites");
  favoriteIds = new Set(ids.map(String));
  return ids.map(String);
}

/** POST /api/users/me/favorites/:id */
export async function addToFavorites(id: string): Promise<void> {
  await apiFetch(`/users/me/favorites/${id}`, { method: "POST" });
  favoriteIds.add(id);
}

/** DELETE /api/users/me/favorites/:id */
export async function removeFromFavorites(id: string): Promise<void> {
  await apiFetch(`/users/me/favorites/${id}`, { method: "DELETE" });
  favoriteIds.delete(id);
}

/** GET /api/courses/my-list */
export async function getMyListCourses(): Promise<Course[]> {
  const data = await apiFetch<Course[] | { results: Course[] }>("/courses/my-list");
  return unwrapResults(data);
}

/** GET /api/courses/top-rated */
export async function getTopRated(): Promise<Course[]> {
  const data = await apiFetch<Course[] | { results: Course[] }>("/courses/top-rated", {
    auth: false,
  });
  return unwrapResults(data);
}

/** GET /api/courses/most-popular */
export async function getMostPopular(): Promise<Course[]> {
  const data = await apiFetch<Course[] | { results: Course[] }>("/courses/most-popular", {
    auth: false,
  });
  return unwrapResults(data);
}

/** GET /api/recommendations — motor de recomendación (scikit-learn en el backend) */
export async function getRecommended(_intereses: string[]): Promise<Course[]> {
  return apiFetch<Course[]>("/recommendations");
}

/** GET /api/courses/viewed — materias vistas pendientes de calificar */
export async function getViewedCourses(_viewedIds: string[]): Promise<Course[]> {
  const data = await apiFetch<Course[] | { results: Course[] }>("/courses/viewed");
  return unwrapResults(data);
}

/** GET /api/courses?search= */
export async function searchCourses(query: string): Promise<Course[]> {
  const data = await apiFetch<Course[] | { results: Course[] }>(
    `/courses?search=${encodeURIComponent(query)}`,
    { auth: false }
  );
  return unwrapResults(data);
}

/** Estado de calificación local (síncrono, ver loadUserCourseState) */
export function getUserRating(courseId: string): number | null {
  return ratingsMap[courseId] ?? null;
}

/** Estado de lista local (síncrono, ver loadUserCourseState) */
export function isFavorite(courseId: string): boolean {
  return favoriteIds.has(courseId);
}
