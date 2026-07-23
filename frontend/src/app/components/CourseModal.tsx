import { useState, useEffect } from "react";
import { X, Plus, ThumbsUp, Share2, BookOpen, Building2, Hash, Tag, User2, Users, Clock, Zap, ChevronDown, Check, ListPlus, Flame, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type Course } from "../data/courses";
import { StarRating } from "./StarRating";
import * as courseService from "../services/courseService";
import { getCourseImageUrl, svgPlaceholder } from "../utils/courseImage";
import { shareCourse } from "../utils/share";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface CourseModalProps {
  course: Course | null;
  onClose: () => void;
}

const modalityColors: Record<string, string> = {
  presencial: "var(--unal-green)",
  virtual: "#3b82f6",
  híbrida: "#f59e0b",
};

const difficultyColors: Record<string, string> = {
  Básico: "#6b7280",
  Intermedio: "#f59e0b",
  Avanzado: "var(--unal-crimson)",
};

export function CourseModal({ course, onClose }: CourseModalProps) {
  const { user } = useAuth();
  // `inList` y `liked` son locales — se sincronizan con el servicio en el
  // useEffect cuando cambia `course?.id`.
  const [inList, setInList] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Comentario + flag anónimo al calificar — se envían junto con el rating.
  const [commentDraft, setCommentDraft] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  // `pendingRating` guarda el rating que el usuario eligió en las estrellas
  // antes de presionar "Publicar" — así puede escribir el comentario primero.
  const [pendingRating, setPendingRating] = useState<number | null>(null);

  // Estado de "popular" — se sincroniza con course.popular cada vez que
  // cambia el curso. El botón llama a togglePopular() y actualiza el flag.
  const [popularState, setPopularState] = useState(false);
  const [togglingPopular, setTogglingPopular] = useState(false);

  // `userRating` se deriva SIEMPRE del servicio (no state local), para evitar
  // el bug de "calificaciones compartidas entre cursos": el valor se consulta
  // fresco desde `ratingsMap` cada render, así que cambiar de curso nunca
  // arrastraba la calificación del anterior. Forzamos re-render con un
  // contador `version` tras cada mutación.
  const [version, setVersion] = useState(0);
  const userRating = course ? courseService.getUserRating(course.id) : null;

  // Sincronizar el estado local cuando cambia el curso.
  useEffect(() => {
    if (!course) return;
    setInList(courseService.isFavorite(course.id));
    setLiked(false);
    setShowAllReviews(false);
    setCommentDraft("");
    setIsAnonymous(false);
    setPendingRating(null);
    setPopularState(!!course.popular);
    setVersion((v) => v + 1); // fuerza re-lectura de userRating
  }, [course?.id]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!course) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Bloquear scroll del body mientras el modal está abierto
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [course, onClose]);

  const handleRate = async (n: number) => {
    // Primera interacción: guardamos el rating elegido y enfocamos el textarea.
    // La calificación se publica cuando el usuario presiona "Publicar".
    if (pendingRating === null) {
      setPendingRating(n);
      return;
    }
    // Si ya tenía un pending, cambiar las estrellas solo actualiza el draft.
    setPendingRating(n);
  };

  const handlePublishRating = async () => {
    if (!course || pendingRating === null) return;
    try {
      await courseService.rateCourse(course.id, pendingRating, {
        comment: commentDraft.trim(),
        isAnonymous,
      });
      setVersion((v) => v + 1);
      setPendingRating(null);
      setCommentDraft("");
      setIsAnonymous(false);
      toast.success(`Calificaste "${course.title}" con ${pendingRating} estrellas`, {
        description: commentDraft.trim() ? "Tu comentario fue publicado" : undefined,
      });
    } catch (err) {
      toast.error("No se pudo guardar tu calificación. Intenta de nuevo.");
    }
  };

  const handleCancelRating = () => {
    setPendingRating(null);
    setCommentDraft("");
    setIsAnonymous(false);
  };

  const handleRemoveRating = async () => {
    if (!course) return;
    await courseService.removeRating(course.id);
    setVersion((v) => v + 1);
    toast.info(`Calificación de "${course.title}" eliminada`);
  };

  const toggleList = async () => {
    if (!course) return;
    const next = !inList;
    setInList(next);
    if (next) {
      await courseService.addToFavorites(course.id);
      toast.success(`"${course.title}" agregada a tu lista`, {
        description: "Puedes verla en la sección Mi Lista",
      });
    } else {
      await courseService.removeFromFavorites(course.id);
      toast.info(`"${course.title}" removida de tu lista`);
    }
  };

  const handleShare = async () => {
    if (!course) return;
    const ok = await shareCourse(course);
    if (ok) {
      // Si la Web Share API abrió el sheet nativo, no mostramos toast (el
      // usuario ya vio la acción). Si caímos al clipboard, sí.
      if (typeof navigator !== "undefined" && !("share" in navigator)) {
        toast.success("Enlace copiado al portapapeles", {
          description: "Pégalo donde quieras compartirlo",
        });
      }
    }
  };

  const handleTogglePopular = async () => {
    if (!course) return;
    setTogglingPopular(true);
    try {
      const isAdmin = user?.isStaff ?? false;
      // Si es admin, toggle directo. Si es usuario normal, siempre upvote
      // (no puede "despopularizar").
      const wants = isAdmin ? !popularState : true;
      const result = await courseService.togglePopular(course.id, wants);
      setPopularState(result.popular);
      toast.success(result.message);
    } catch (err) {
      toast.error("No se pudo actualizar el estado de popularidad.");
    } finally {
      setTogglingPopular(false);
    }
  };

  // `version` se incluye solo para evitar el warning de "unused variable" —
  // en realidad `userRating` ya se re-evalúa cada render; el setVersion en
  // los handlers fuerza el re-render que dispara esa re-evaluación.
  void version;

  const reviews = course?.reviews ?? [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);
  const isAdmin = user?.isStaff ?? false;
  // `userRating` es la calificación ya guardada (de ratingsMap).
  // `pendingRating` es la que el usuario está eligiendo pero aún no publica.
  const ratingForStars = pendingRating !== null ? pendingRating : (userRating ?? 0);

  return (
    <AnimatePresence>
      {course && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 overflow-y-auto rounded-xl"
            style={{
              top: "5vh",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(700px, 92vw)",
              maxHeight: "88vh",
              background: "var(--unal-surface-card)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.9)",
              scrollbarWidth: "thin",
            }}
          >
            {/* Hero image */}
            <div className="relative" style={{ height: "240px" }}>
              <img
                src={getCourseImageUrl(course)}
                alt={course.title}
                className="w-full h-full object-cover rounded-t-xl"
                onError={(e) => {
                  const t = e.currentTarget;
                  if (t.src !== t.dataset.fallback) {
                    t.dataset.fallback = svgPlaceholder(course);
                    t.src = t.dataset.fallback;
                  }
                }}
              />
              <div
                className="absolute inset-0 rounded-t-xl"
                style={{ background: "linear-gradient(to top, var(--unal-surface-card) 0%, rgba(24,24,24,0.4) 55%, transparent 100%)" }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <X size={16} className="text-white" />
              </button>

              {/* Badges */}
              <div className="absolute top-4 left-5 flex gap-2">
                {popularState && (
                  <span className="text-white text-xs font-black px-3 py-1 rounded" style={{ background: "var(--unal-crimson)" }}>
                    POPULAR
                  </span>
                )}
                {course.isNew && (
                  <span className="text-white text-xs font-black px-3 py-1 rounded" style={{ background: "var(--unal-green)" }}>
                    NUEVO
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="absolute bottom-4 left-6 right-6">
                <h2
                  className="text-white leading-tight"
                  style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}
                >
                  {course.title}
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="px-7 pb-8 pt-5">
              {/* Actions */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={toggleList}
                  className="flex items-center gap-2 px-7 py-2.5 rounded font-bold transition-all shadow-md"
                  style={{
                    background: inList ? "var(--unal-green)" : "#fff",
                    color: inList ? "#fff" : "#000",
                  }}
                >
                  {inList ? (
                    <>
                      <Check size={16} />
                      En tu lista
                    </>
                  ) : (
                    <>
                      <ListPlus size={16} />
                      Agregar a lista
                    </>
                  )}
                </button>
                <button
                  onClick={toggleList}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ background: inList ? "#fff" : "transparent", borderColor: inList ? "#fff" : "rgba(255,255,255,0.4)" }}
                  title={inList ? "Quitar de mi lista" : "Agregar a mi lista"}
                >
                  <Plus size={18} className={inList ? "text-black rotate-45" : "text-white"} style={{ transition: "transform 0.2s" }} />
                </button>
                <button
                  onClick={() => setLiked(!liked)}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ borderColor: liked ? "var(--unal-green)" : "rgba(255,255,255,0.4)" }}
                  title="Me gusta"
                >
                  <ThumbsUp size={18} style={{ color: liked ? "var(--unal-green)" : "#fff" }} />
                </button>
                {/* Botón Compartir — funcional con Web Share API + fallback clipboard */}
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full border-2 border-white/30 hover:border-white flex items-center justify-center transition-all"
                  title="Compartir materia"
                >
                  <Share2 size={18} className="text-white" />
                </button>
                {/* Botón "Marcar como popular" / "Quitar popular"
                    - Admin: toggle directo (Pin popular)
                    - Usuario: upvote (suma 1 a enrollment_count) */}
                <button
                  onClick={handleTogglePopular}
                  disabled={togglingPopular}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: popularState ? "var(--unal-crimson)" : "rgba(255,255,255,0.4)",
                    background: popularState ? "rgba(232,182,0,0.15)" : "transparent",
                    opacity: togglingPopular ? 0.5 : 1,
                  }}
                  title={
                    isAdmin
                      ? (popularState ? "Quitar marca de popular" : "Marcar como popular (admin)")
                      : (popularState ? "Ya está marcada como popular" : "Votar para marcar como popular")
                  }
                >
                  <Flame
                    size={18}
                    style={{
                      color: popularState ? "var(--unal-crimson)" : "#fff",
                      fill: popularState ? "var(--unal-crimson)" : "none",
                    }}
                  />
                </button>
              </div>

              {/* Two-column info */}
              <div className="grid gap-6 mb-5" style={{ gridTemplateColumns: "1fr 210px" }}>
                {/* Left */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-bold" style={{ color: "var(--unal-green)", fontSize: "15px" }}>
                      {course.matchPercent}% afín a tu perfil
                    </span>
                    <span className="border border-gray-500 text-white rounded px-2 py-0.5" style={{ fontSize: "12px" }}>
                      {course.credits} créditos
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed" style={{ fontSize: "14px" }}>
                    {course.description}
                  </p>
                </div>

                {/* Right — metadata */}
                <div className="space-y-2.5" style={{ fontSize: "13px" }}>
                  <div className="flex items-start gap-2">
                    <Hash size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="text-gray-500">Código: </span>
                      <span className="text-white font-mono">{course.code}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="text-gray-500">Facultad: </span>
                      <span className="text-white">{course.faculty}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <User2 size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="text-gray-500">Docente: </span>
                      <span className="text-white">{course.teacher}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="text-gray-500">Créditos: </span>
                      <span className="text-white">{course.credits}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500">Nivel: </span>
                    <span
                      className="px-2 py-0.5 rounded text-white"
                      style={{ background: difficultyColors[course.difficulty] + "33", color: difficultyColors[course.difficulty], border: `1px solid ${difficultyColors[course.difficulty]}55`, fontSize: 11 }}
                    >
                      {course.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-white"
                      style={{ background: modalityColors[course.modality] + "33", color: modalityColors[course.modality], border: `1px solid ${modalityColors[course.modality]}55`, fontSize: 11 }}
                    >
                      {course.modality}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-gray-500 flex-shrink-0" />
                    <span
                      style={{ color: course.seatsAvailable < 5 ? "var(--unal-crimson)" : "#9ca3af", fontSize: 13 }}
                    >
                      {course.seatsAvailable} cupos disponibles
                    </span>
                  </div>
                  {course.prerequisites.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Tag size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-500">Prerrequisitos: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {course.prerequisites.map((p) => (
                            <span key={p} className="text-white border border-white/20 rounded px-1.5 py-0.5" style={{ fontSize: 11 }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horario */}
              {course.schedule.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-gray-400 text-sm font-semibold">Horario</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {course.schedule.map((s) => (
                      <span
                        key={s}
                        className="text-gray-200 rounded px-3 py-1 text-sm"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Calificación + Comentarios */}
              <div className="mb-5 p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-gray-400 text-sm font-semibold mb-2">Calificación y comentario</p>

                {/* Caso A: el usuario ya calificó — mostrar su calificación + botón quitar */}
                {userRating !== null && pendingRating === null ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm mb-1" style={{ color: "var(--unal-green)" }}>
                        Tu calificación:
                      </p>
                      <button
                        onClick={handleRemoveRating}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                        style={{ fontSize: 12 }}
                      >
                        Quitar calificación
                      </button>
                    </div>
                    <StarRating rating={userRating} readonly size="md" showValue />
                    <button
                      onClick={() => { setPendingRating(userRating); }}
                      className="mt-2 text-xs hover:underline"
                      style={{ color: "var(--unal-green)" }}
                    >
                      Editar tu calificación y comentario
                    </button>
                  </div>
                ) : (
                  /* Caso B: el usuario está eligiendo o editando — mostrar estrellas interactivas + textarea */
                  <div>
                    <p className="text-gray-400 text-xs mb-2">
                      {pendingRating === null
                        ? "¿Ya cursaste esta materia? Califícala y deja tu comentario:"
                        : `Elegiste ${pendingRating} estrellas — escribe tu comentario (opcional) y publícalo:`}
                    </p>
                    <StarRating
                      rating={ratingForStars}
                      onRate={handleRate}
                      size="md"
                    />
                    {/* Textarea de comentario — visible solo cuando hay rating pendiente */}
                    {pendingRating !== null && (
                      <div className="mt-3">
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Cuéntale a otros estudiantes qué te pareció esta materia (profesor, carga, contenido, recomendaciones...)"
                          rows={3}
                          maxLength={500}
                          className="w-full rounded-lg p-2.5 text-sm outline-none resize-y"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff",
                          }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
                            <input
                              type="checkbox"
                              checked={isAnonymous}
                              onChange={(e) => setIsAnonymous(e.target.checked)}
                              style={{ accentColor: "var(--unal-green)" }}
                            />
                            {isAnonymous ? <EyeOff size={12} /> : <Eye size={12} />}
                            Publicar como anónimo
                          </label>
                          <span className="text-gray-600 text-xs">
                            {commentDraft.length}/500
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={handlePublishRating}
                            className="px-4 py-1.5 rounded font-semibold text-white text-sm transition-all"
                            style={{ background: "var(--unal-green)" }}
                          >
                            Publicar calificación
                          </button>
                          <button
                            onClick={handleCancelRating}
                            className="px-4 py-1.5 rounded text-sm text-gray-400 hover:text-white transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Promedio general del curso */}
                <div className="flex items-center gap-2 mt-2 mb-3">
                  <StarRating rating={course.rating} readonly size="sm" showValue />
                  <span className="text-gray-500" style={{ fontSize: 12 }}>
                    ({course.reviewCount} reseñas)
                  </span>
                </div>
                {course.ratingBreakdown && course.reviewCount > 0 && (
                  <div className="space-y-1 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const count = course.ratingBreakdown?.[String(star) as "1" | "2" | "3" | "4" | "5"] ?? 0;
                      const pct = course.reviewCount > 0 ? Math.round((count / course.reviewCount) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-gray-500 w-3 text-right" style={{ fontSize: 11 }}>
                            {star}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: "var(--unal-green)" }}
                            />
                          </div>
                          <span className="text-gray-600 w-6 text-right" style={{ fontSize: 11 }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reviews */}
              {reviews.length > 0 && (
                <div>
                  <div
                    className="mb-4 pb-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-white font-semibold text-sm">
                      Reseñas de estudiantes ({reviews.length})
                    </p>
                  </div>
                  <div className="space-y-4">
                    {visibleReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-3 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">{review.author}</span>
                            <span className="text-gray-600 text-xs">· {review.semester}</span>
                          </div>
                          <StarRating rating={review.rating} readonly size="sm" />
                        </div>
                        {review.comment && (
                          <p className="text-gray-400 leading-relaxed" style={{ fontSize: "13px" }}>
                            "{review.comment}"
                          </p>
                        )}
                        <p className="text-gray-600 mt-1" style={{ fontSize: 11 }}>
                          {new Date(review.date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                  {reviews.length > 2 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="flex items-center gap-1 mt-3 text-sm transition-colors"
                      style={{ color: "var(--unal-green)" }}
                    >
                      {showAllReviews ? "Ver menos" : `Ver ${reviews.length - 2} reseñas más`}
                      <ChevronDown
                        size={14}
                        style={{ transform: showAllReviews ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                      />
                    </button>
                  )}
                </div>
              )}

              {/* Footer */}
              <div
                className="mt-6 pt-4 flex items-center justify-between text-gray-600"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: "12px" }}
              >
                <span>Universidad Nacional de Colombia</span>
                <span>Libre Elección · 2025-II</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
