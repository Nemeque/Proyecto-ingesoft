import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { SlidersHorizontal, Plus, Sparkles, Search as SearchIcon, X } from "lucide-react";
import { type Course } from "../data/courses";
import { CourseCard } from "../components/CourseCard";
import { CourseModal } from "../components/CourseModal";
import { CourseRequestModal } from "../components/CourseRequestModal";
import { FilterBar, type FilterState, defaultFilters } from "../components/FilterBar";
import * as courseService from "../services/courseService";

type SortOption = "recommended" | "rating" | "popular" | "az";

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recomendadas",
  rating: "Mejor Valoradas",
  popular: "Más Populares",
  az: "A → Z",
};

// Mapea el ?cat= que viene del "Ver todo" del Home al título de la página.
const CATEGORY_TITLES: Record<string, string> = {
  recommended: "Recomendadas para ti",
  "top-rated": "Mejor Valoradas",
  popular: "Más Populares",
  rate: "Vistas para Calificar",
};

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("cat");
  const searchQuery = searchParams.get("search") ?? "";

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortOption>(cat === "top-rated" ? "rating" : cat === "popular" ? "popular" : "recommended");
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    async function load() {
      let data: Course[] = [];
      try {
        if (searchQuery) {
          // Búsqueda libre desde el navbar — busca por título, código, docente, tags.
          data = await courseService.searchCourses(searchQuery);
        } else if (cat === "top-rated") {
          data = await courseService.getTopRated();
        } else if (cat === "popular") {
          data = await courseService.getMostPopular();
        } else if (cat === "recommended") {
          data = await courseService.getRecommended([]);
        } else if (cat === "rate") {
          data = await courseService.getViewedCourses([]);
        } else {
          data = await courseService.getCourses();
        }
      } catch {
        data = [];
      }
      setAllCourses(data);
      setLoading(false);
    }
    load();
  }, [cat, searchQuery]);

  const facultades = useMemo(
    () => [...new Set(allCourses.map((c) => c.faculty))].sort(),
    [allCourses]
  );

  const filtered = useMemo(() => {
    let result = [...allCourses];

    if (filters.modality.length > 0) {
      result = result.filter((c) => filters.modality.includes(c.modality));
    }
    if (filters.facultad) {
      result = result.filter((c) => c.faculty === filters.facultad);
    }
    if (filters.difficulty.length > 0) {
      result = result.filter((c) => filters.difficulty.includes(c.difficulty));
    }
    result = result.filter(
      (c) => c.credits >= filters.creditsMin && c.credits <= filters.creditsMax
    );
    if (filters.withSeatsOnly) {
      result = result.filter((c) => c.seatsAvailable > 0);
    }

    switch (sort) {
      case "rating":
        result.sort((a, b) => Number(b.rating) - Number(a.rating));
        break;
      case "popular":
        result.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
        break;
      case "az":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        result.sort((a, b) => Number(b.matchPercent) - Number(a.matchPercent));
    }

    return result;
  }, [allCourses, filters, sort]);

  const pageTitle = searchQuery
    ? `Resultados para "${searchQuery}"`
    : cat
      ? CATEGORY_TITLES[cat] ?? "Explorar Materias"
      : "Explorar Materias";

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("search");
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--unal-surface)" }}>
      {/* Page header */}
      <div className="pt-20 px-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-0.5" style={{ fontSize: "1.8rem", fontWeight: 700 }}>
              {pageTitle}
            </h1>
            <p className="text-gray-400 text-sm">
              {loading ? "Cargando..." : `${filtered.length} materia${filtered.length !== 1 ? "s" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="mt-2 flex items-center gap-1 text-sm hover:underline"
                style={{ color: "var(--unal-green)" }}
              >
                <X size={13} />
                Limpiar búsqueda
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Solicitar agregar materia */}
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, var(--unal-crimson), var(--unal-crimson-dark))",
              }}
              title="¿No encuentras una materia? Pídenos añadirla"
            >
              <Sparkles size={15} />
              <span className="hidden sm:inline">Solicitar materia</span>
            </button>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-gray-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-sm rounded-lg px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              >
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <option key={val} value={val} style={{ background: "#1a1a1a" }}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} facultades={facultades} />

      {/* Grid */}
      <div className="px-8 pt-6 pb-10">
        {loading ? (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded animate-pulse"
                style={{ height: "112px", background: "rgba(255,255,255,0.05)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {searchQuery ? (
              <>
                <SearchIcon size={32} className="text-gray-600 mb-3" />
                <p className="text-gray-400 text-lg mb-2">
                  No se encontraron materias para "{searchQuery}"
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  Intenta con otro término o solicita que agreguemos la materia
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-lg mb-2">No se encontraron materias</p>
                <p className="text-gray-600 text-sm mb-6">Intenta ajustar los filtros</p>
              </>
            )}
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: "var(--unal-crimson)" }}
            >
              <Plus size={15} />
              Solicitar agregar materia
            </button>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          >
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} onMoreInfo={setSelectedCourse} />
            ))}
          </div>
        )}
      </div>

      <CourseModal
        key={selectedCourse?.id ?? "none"}
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
      <CourseRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}
