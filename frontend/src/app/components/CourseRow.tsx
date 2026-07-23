import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { type Category, type Course } from "../data/courses";

interface CourseRowProps {
  category: Category;
  onMoreInfo: (course: Course) => void;
}

export function CourseRow({ category, onMoreInfo }: CourseRowProps) {
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({
      left: direction === "left" ? -620 : 620,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    if (!rowRef.current) return;
    setShowLeft(rowRef.current.scrollLeft > 10);
    setShowRight(
      rowRef.current.scrollLeft <
        rowRef.current.scrollWidth - rowRef.current.clientWidth - 10
    );
  };

  // "Ver todo" lleva al catálogo completo en /explore. La categoría se pasa
  // como query string para que ExplorePage pueda pre-filtrar si lo deseamos.
  const handleSeeAll = () => {
    navigate(`/explore?cat=${encodeURIComponent(category.id)}`);
  };

  return (
    <div className="mb-10 group/row">
      {/* Row header */}
      <div className="flex items-center gap-2 px-10 mb-3">
        <span style={{ fontSize: "1.1rem" }}>{category.emoji}</span>
        <h2
          className="text-white"
          style={{ fontSize: "1.25rem", fontWeight: 600 }}
        >
          {category.name}
        </h2>
        <button
          onClick={handleSeeAll}
          className="text-[#58A618] font-medium ml-1 opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 hover:underline cursor-pointer"
          style={{ fontSize: "13px" }}
          title={`Ver todas las materias de ${category.name}`}
        >
          Ver todo
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        {/* Left arrow */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center transition-all hover:bg-black/70"
            style={{
              width: "48px",
              background: "linear-gradient(to right, rgba(20,20,20,0.9), transparent)",
            }}
          >
            <ChevronLeft size={28} className="text-white drop-shadow-lg" />
          </button>
        )}

        {/* Right arrow */}
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center transition-all hover:bg-black/70"
            style={{
              width: "48px",
              background: "linear-gradient(to left, rgba(20,20,20,0.9), transparent)",
            }}
          >
            <ChevronRight size={28} className="text-white drop-shadow-lg" />
          </button>
        )}

        {/* Cards scroll container */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto py-6 px-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {category.courses.map((course) => (
            <CourseCard key={course.id} course={course} onMoreInfo={onMoreInfo} />
          ))}
        </div>
      </div>
    </div>
  );
}
