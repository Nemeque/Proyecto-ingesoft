import { Play, Info, BookOpen } from "lucide-react";
import { motion } from "motion/react";
import { type Course } from "../data/courses";
import { getCourseImageUrl, svgPlaceholder } from "../utils/courseImage";

interface HeroSectionProps {
  course: Course;
  onMoreInfo: (course: Course) => void;
}

export function HeroSection({ course, onMoreInfo }: HeroSectionProps) {
  return (
    <div className="relative w-full" style={{ height: "85vh", minHeight: "620px" }}>
      {/* Background image */}
      <img
        src={getCourseImageUrl(course)}
        alt={course.title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          const t = e.currentTarget;
          if (t.src !== t.dataset.fallback) {
            t.dataset.fallback = svgPlaceholder(course);
            t.src = t.dataset.fallback;
          }
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/20" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 px-12 pb-24 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Badges */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[#58A618] font-bold text-sm">
              {course.matchPercent}% afín a ti
            </span>
            {course.popular && (
              <span className="bg-[#E8B600] text-black text-xs font-black px-2.5 py-0.5 rounded tracking-wide uppercase">
                Popular
              </span>
            )}
            {course.isNew && (
              <span className="bg-[#58A618] text-white text-xs font-black px-2.5 py-0.5 rounded tracking-wide uppercase">
                Nuevo
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-white mb-3"
            style={{ fontSize: "3.2rem", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            {course.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-5 text-sm text-gray-300">
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#E8B600]" />
              {course.credits} créditos
            </span>
            <span className="text-gray-600">•</span>
            <span>{course.faculty}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500 font-mono text-xs">{course.code}</span>
          </div>

          {/* Description */}
          <p className="text-gray-200 leading-relaxed mb-6 max-w-lg" style={{ fontSize: "0.95rem" }}>
            {course.description}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-2 mb-7">
            {course.tags.map((tag) => (
              <span
                key={tag}
                className="border border-white/30 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-100 transition-colors shadow-lg">
              <Play size={18} fill="black" />
              Ver Detalles
            </button>
            <button
              onClick={() => onMoreInfo(course)}
              className="flex items-center gap-2 bg-white/20 text-white px-8 py-3 rounded font-bold hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/10"
            >
              <Info size={18} />
              Más Información
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
