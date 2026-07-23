import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Compass } from "lucide-react";
import { type Course } from "../data/courses";
import { CourseCard } from "../components/CourseCard";
import { CourseModal } from "../components/CourseModal";
import * as courseService from "../services/courseService";

export function MyListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService.getMyListCourses().then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  return (
    <div
      className="min-h-screen pt-20 px-8 pb-10"
      style={{ background: "var(--unal-surface)" }}
    >
      <div className="mb-8">
        <h1 className="text-white mb-1" style={{ fontSize: "1.8rem", fontWeight: 700 }}>
          Mi Lista
        </h1>
        <p className="text-gray-400 text-sm">
          {loading ? "Cargando..." : `${courses.length} materia${courses.length !== 1 ? "s" : ""} guardada${courses.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded animate-pulse"
              style={{ height: "112px", background: "rgba(255,255,255,0.05)" }}
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Compass size={28} className="text-gray-500" />
          </div>
          <p className="text-white text-lg font-semibold mb-2">Tu lista está vacía</p>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Explora materias y agrega las que te interesen usando el botón{" "}
            <span className="text-white">+</span> en cada tarjeta.
          </p>
          <Link
            to="/explore"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
            style={{ background: "var(--unal-green)" }}
          >
            <Compass size={16} />
            Explorar Materias
          </Link>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onMoreInfo={setSelectedCourse} />
          ))}
        </div>
      )}

      <CourseModal
        key={selectedCourse?.id ?? "none"}
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
