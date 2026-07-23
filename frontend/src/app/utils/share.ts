import type { Course } from "../data/courses";

/**
 * Comparte una materia usando la Web Share API nativa cuando esté disponible
 * (móviles, algunos navegadores de escritorio). Si no está disponible, copia
 * un texto con el nombre y código al portapapeles y muestra un toast.
 *
 * Devuelve `true` si la acción se completó (compartido o copiado), `false` si
 * falló o el usuario canceló.
 */
export async function shareCourse(course: Course): Promise<boolean> {
  const shareUrl = `${window.location.origin}/explore?search=${encodeURIComponent(course.code)}`;
  const title = `Materia: ${course.title}`;
  const text = `Mira esta materia de libre elección:\n\n${course.title}\nCódigo: ${course.code}\nFacultad: ${course.faculty}\nCréditos: ${course.credits}\n\n${shareUrl}`;

  // 1) Web Share API (móvil + Edge/Chrome desktop recientes)
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title, text, url: shareUrl });
      return true;
    } catch (err) {
      // AbortError = el usuario canceló. Otros errores → caer al clipboard.
      if (err instanceof DOMException && err.name === "AbortError") return false;
    }
  }

  // 2) Fallback: copiar al portapapeles
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // seguir al fallback legacy
    }
  }

  // 3) Fallback legacy con textarea + execCommand (para navegadores viejos)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
