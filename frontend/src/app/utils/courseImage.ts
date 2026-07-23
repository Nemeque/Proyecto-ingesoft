import type { Course } from "../data/courses";

/**
 * Asigna una imagen deterministamente a cada materia — el mismo `course.code`
 * siempre recibe la misma imagen, pero materias con códigos distintos reciben
 * imágenes distintas.
 *
 * Si `course.image` viene del CSV/scraper, se respeta. Si no, se selecciona
 * una foto del pool local `/public/courses/course_N.png` con un hash del código.
 *
 * El pool ahora tiene 30 imágenes temáticas (course_1.png .. course_30.png)
 * cubriendo: programación, arte, ciencias, música, biblioteca, negocios,
 * deportes, idiomas, filosofía, ingeniería, teatro, matemáticas, naturaleza,
 * medicina y arquitectura. Esto da variedad suficiente para que materias
 * distintas casi nunca compartan la misma foto, incluso con 50+ cursos.
 */

// 30 imágenes temáticas pre-generadas en /public/courses/.
const POOL_SIZE = 30;

function hashString(s: string): number {
  // FNV-1a simple — determinista y rápido, sin dependencias.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function pickFromPool(key: string): string {
  const n = (hashString(key) % POOL_SIZE) + 1;
  return `${import.meta.env.BASE_URL}courses/course_${n}.png`;
}

/**
 * SVG placeholder generado al vuelo — sin red, sin dependencias externas.
 * Muestra las iniciales de la facultad sobre un gradiente del color UNAL.
 * Útil si las fotos locales no cargan o no se generaron todavía.
 */
function svgPlaceholder(course: Pick<Course, "image" | "code" | "faculty" | "title">): string {
  const initials = (course.faculty || course.title || course.code || "LC")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  // Color de fondo determinista por código — variety visual.
  const hue = hashString(course.code || course.title || "x") % 360;
  const bg1 = `hsl(${hue}, 45%, 22%)`;
  const bg2 = `hsl(${(hue + 30) % 360}, 50%, 15%)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${bg1}'/>
        <stop offset='100%' stop-color='${bg2}'/>
      </linearGradient>
    </defs>
    <rect width='800' height='450' fill='url(#g)'/>
    <text x='400' y='225' font-family='sans-serif' font-size='140' font-weight='bold' fill='rgba(255,255,255,0.85)' text-anchor='middle' dominant-baseline='middle' letter-spacing='8'>${initials}</text>
    <text x='400' y='330' font-family='sans-serif' font-size='28' fill='rgba(255,255,255,0.6)' text-anchor='middle'>${course.code || ""}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getCourseImageUrl(
  course: Pick<Course, "image" | "code" | "faculty" | "title">
): string {
  // 1) Si el CSV/scraper trae una URL explícita, respetarla.
  if (course.image) return course.image;
  // 2) Si no, usar una foto del pool local — determinística por código.
  return pickFromPool(course.code || course.title || "x");
}

/**
 * Variante con fallback SVG — para componentes que necesitan una imagen que
 * NUNCA falle (hero, modal grande). Si la foto del pool no carga, el <img>
 * puede hacer `onError` y reemplazar por el SVG.
 */
export function getCourseImageWithFallback(
  course: Pick<Course, "image" | "code" | "faculty" | "title">
): { src: string; fallback: string } {
  return {
    src: getCourseImageUrl(course),
    fallback: svgPlaceholder(course),
  };
}

export { svgPlaceholder };
