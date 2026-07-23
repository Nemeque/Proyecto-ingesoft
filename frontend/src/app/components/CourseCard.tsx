import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ThumbsUp, ChevronDown, Play, Check, Star, X } from "lucide-react";
import { type Course } from "../data/courses";
import { StarRating } from "./StarRating";
import * as courseService from "../services/courseService";
import { getCourseImageUrl, svgPlaceholder } from "../utils/courseImage";

interface CourseCardProps {
  course: Course;
  onMoreInfo: (course: Course) => void;
}

const modalityColors: Record<string, string> = {
  presencial: "var(--unal-green)",
  virtual: "#3b82f6",
  híbrida: "#f59e0b",
};

/**
 * Versión "Netflix-style" del card de materia.
 *
 * Comportamiento:
 *  - Hover sobre el thumbnail → aparece el card expandido en un Portal al
 *    <body> con `position: fixed` (no rompe el `overflow-x-auto` del row).
 *  - Click sobre el thumbnail → "pineza" el card expandido: se queda abierto
 *    aunque el mouse salga, para que el usuario pueda hacer click en los
 *    botones internos (Play, +lista, me gusta, más info).
 *  - Click en el botón ✕ del card pineado, o click en el thumbnail de nuevo
 *    → se despinea y se cierra.
 *  - Click en "Play" o "Más información" dentro del card → abre el modal
 *    grande con todos los detalles.
 *
 * El truco para que la expansión NO rompa el layout del row scrollable:
 * renderizamos el card expandido en un Portal al `<body>` con `position: fixed`,
 * posicionándolo con las coordenadas reales (getBoundingClientRect) del
 * thumbnail original. Así el row se queda estático, sin scrollbars raros, y la
 * expansión flota limpia por encima de todo — exactamente como en Netflix.
 */
export function CourseCard({ course, onMoreInfo }: CourseCardProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [inList, setInList] = useState(() => courseService.isFavorite(course.id));
  const [liked, setLiked] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // El card expandido se muestra si hay hover o está pineado.
  const expanded = hovered || pinned;

  // Calcular coordenadas del viewport cuando la expansión empieza — así el
  // portal sabe exactamente dónde pintarse.
  useLayoutEffect(() => {
    if (!expanded || !thumbnailRef.current) return;
    const r = thumbnailRef.current.getBoundingClientRect();
    // Centrar el card expandido (280px) sobre el thumbnail (200px): el extra
    // de 80px se reparte 40 a cada lado. Si se sale del viewport, se ajusta.
    const expandedW = 280;
    let left = r.left + r.width / 2 - expandedW / 2;
    const margin = 8;
    if (left < margin) left = margin;
    if (left + expandedW > window.innerWidth - margin) {
      left = window.innerWidth - margin - expandedW;
    }
    // top: alinear el borde superior del expandido con el thumbnail, subiendo
    // un poco para que se vea el "crecimiento" netflix.
    let top = r.top - 16;
    const expandedH = 420; // aproximado — el contenido se ajusta solo
    if (top + expandedH > window.innerHeight - margin) {
      top = window.innerHeight - margin - expandedH;
    }
    if (top < margin) top = margin;
    setCoords({ top, left });
  }, [expanded]);

  const toggleList = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !inList;
    setInList(next);
    if (next) {
      await courseService.addToFavorites(course.id);
    } else {
      await courseService.removeFromFavorites(course.id);
    }
  };

  // Click en el thumbnail: TOGGLE pineo (no abre modal directamente).
  // El modal se abre desde el botón Play / Más información del card expandido.
  const handleThumbnailClick = () => {
    setPinned((p) => !p);
  };

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: "200px", zIndex: pinned ? 30 : (hovered ? 20 : 1) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Base thumbnail */}
      <div
        ref={thumbnailRef}
        className="w-full rounded overflow-hidden cursor-pointer relative"
        style={{
          height: "112px",
          outline: pinned ? "2px solid var(--unal-green)" : "none",
          outlineOffset: pinned ? "2px" : 0,
        }}
        onClick={handleThumbnailClick}
      >
        <img
          src={getCourseImageUrl(course)}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: expanded ? "scale(1.05)" : "scale(1)" }}
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            if (t.src !== t.dataset.fallback) {
              t.dataset.fallback = svgPlaceholder(course);
              t.src = t.dataset.fallback;
            }
          }}
        />
        {/* Rating badge */}
        <div
          className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded px-1.5 py-0.5"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        >
          <Star size={10} fill="var(--unal-green)" stroke="var(--unal-green)" />
          <span className="text-white" style={{ fontSize: 10 }}>
            {Number(course.rating).toFixed(1)}
          </span>
        </div>
        {/* Modality dot */}
        <div
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ background: modalityColors[course.modality] ?? "#6b7280" }}
          title={course.modality}
        />
        {/* Pinned indicator */}
        {pinned && (
          <div
            className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--unal-green)" }}
            title="Click para cerrar"
          >
            <ChevronDown size={10} className="text-white" style={{ transform: "rotate(180deg)" }} />
          </div>
        )}
      </div>

      {/* Hover/Pinned expanded card — renderizado en un portal al <body>
          para que NO lo recorte el `overflow-x-auto` del row y NO genere
          scrollbars. */}
      {expanded && coords && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed rounded-md overflow-hidden shadow-2xl"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: "280px",
              background: "var(--unal-surface-card)",
              zIndex: 9999,
              boxShadow: "0 25px 50px rgba(0,0,0,0.8)",
              pointerEvents: "auto",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
              setHovered(false);
              // Si no está pineado, no hay nada que limpiar — el exit lo
              // maneja AnimatePresence. Si está pineado, se queda.
            }}
          >
            {/* Image */}
            <div className="relative" style={{ height: "146px" }}>
              <img
                src={getCourseImageUrl(course)}
                alt={course.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const t = e.currentTarget;
                  if (t.src !== t.dataset.fallback) {
                    t.dataset.fallback = svgPlaceholder(course);
                    t.src = t.dataset.fallback;
                  }
                }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, var(--unal-surface-card) 0%, transparent 60%)" }}
              />
              <div className="absolute top-2 right-2 flex gap-1">
                {course.isNew && (
                  <span
                    className="text-white text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: "var(--unal-green)", fontSize: "10px" }}
                  >
                    NUEVO
                  </span>
                )}
                {course.popular && (
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: "var(--unal-crimson)", color: "#fff", fontSize: "10px" }}
                  >
                    POPULAR
                  </span>
                )}
              </div>
              {/* Close button — solo visible cuando está pineado */}
              {pinned && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPinned(false); }}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                  title="Cerrar"
                >
                  <X size={12} className="text-white" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-3 pb-3 pt-2">
              {/* Actions */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoreInfo(course); setPinned(false); }}
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-colors shadow"
                    title="Ver detalles (abre modal)"
                  >
                    <Play size={13} fill="black" className="text-black ml-0.5" />
                  </button>
                  <button
                    onClick={toggleList}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      background: inList ? "#fff" : "transparent",
                      borderColor: inList ? "#fff" : "rgba(156,163,175,1)",
                    }}
                    title={inList ? "Quitar de mi lista" : "Agregar a mi lista"}
                  >
                    {inList ? (
                      <Check size={13} className="text-black" />
                    ) : (
                      <Plus size={13} className="text-white" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ borderColor: liked ? "var(--unal-green)" : "rgba(156,163,175,1)" }}
                    title="Me gusta"
                  >
                    <ThumbsUp
                      size={13}
                      style={{ color: liked ? "var(--unal-green)" : "#fff" }}
                    />
                  </button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onMoreInfo(course); setPinned(false); }}
                  className="w-8 h-8 rounded-full border-2 border-gray-400 hover:border-white flex items-center justify-center transition-all"
                  title="Más información"
                >
                  <ChevronDown size={13} className="text-white" />
                </button>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-bold" style={{ color: "var(--unal-green)", fontSize: "12px" }}>
                  {course.matchPercent}% afín
                </span>
                <span
                  className="border border-gray-500 text-white rounded px-1.5"
                  style={{ fontSize: "11px" }}
                >
                  {course.credits} cr
                </span>
                <span
                  className="px-1.5 rounded"
                  style={{
                    fontSize: "10px",
                    background: modalityColors[course.modality] + "33",
                    color: modalityColors[course.modality],
                    border: `1px solid ${modalityColors[course.modality]}55`,
                  }}
                >
                  {course.modality}
                </span>
              </div>

              {/* Star rating readonly */}
              <div className="mb-1">
                <StarRating rating={course.rating} readonly size="sm" showValue />
              </div>

              {/* Title */}
              <h3 className="text-white font-semibold mb-1 leading-tight" style={{ fontSize: "13px" }}>
                {course.title}
              </h3>

              {/* Description */}
              <p
                className="text-gray-400 leading-relaxed mb-2"
                style={{
                  fontSize: "11px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {course.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-x-1">
                {course.tags.slice(0, 3).map((tag, i) => (
                  <span key={tag} className="text-gray-400" style={{ fontSize: "11px" }}>
                    {tag}
                    {i < Math.min(course.tags.length, 3) - 1 && (
                      <span className="text-gray-600 mx-0.5">•</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
