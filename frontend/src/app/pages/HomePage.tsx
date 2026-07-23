import { useState, useEffect } from "react";
import { HeroSection } from "../components/HeroSection";
import { CourseRow } from "../components/CourseRow";
import { CourseModal } from "../components/CourseModal";
import { featuredCourse, type Course, type Category } from "../data/courses";
import { useAuth } from "../context/AuthContext";
import * as courseService from "../services/courseService";

export function HomePage() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [rows, setRows] = useState<Category[]>([]);
  const [hero, setHero] = useState<Course>(featuredCourse);

  useEffect(() => {
    async function loadRows() {
      const [recommended, topRated, popular, viewed] = await Promise.all([
        courseService.getRecommended(user?.intereses ?? []),
        courseService.getTopRated(),
        courseService.getMostPopular(),
        courseService.getViewedCourses(user?.viewedCourses ?? []),
      ]);

      if (topRated[0]) setHero(topRated[0]);

      setRows([
        { id: "recommended", name: "Recomendadas para ti", emoji: "✨", courses: recommended },
        { id: "top-rated", name: "Mejor Valoradas", emoji: "⭐", courses: topRated },
        { id: "popular", name: "Más Populares", emoji: "🔥", courses: popular },
        ...(viewed.length > 0
          ? [{ id: "rate", name: "Vistas para Calificar", emoji: "📝", courses: viewed }]
          : []),
      ]);
    }
    loadRows();
  }, [user]);

  return (
    <div>
      <HeroSection course={hero} onMoreInfo={setSelectedCourse} />

      <div className="relative" style={{ marginTop: "-96px", zIndex: 10 }}>
        {rows.map((row) => (
          <CourseRow key={row.id} category={row} onMoreInfo={setSelectedCourse} />
        ))}
      </div>

      <CourseModal
        key={selectedCourse?.id ?? "none"}
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
