import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--unal-surface)" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer
          className="px-10 py-8 mt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--unal-green), var(--unal-green-dark))",
              }}
            >
              <span className="text-white font-black" style={{ fontSize: 10 }}>
                UN
              </span>
            </div>
            <span className="text-gray-400 text-sm font-semibold">
              Universidad Nacional de Colombia
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-600 mb-3" style={{ fontSize: 12 }}>
            {["Bogotá", "Medellín", "Manizales", "Palmira", "Tumaco", "Arauca", "Leticia", "La Paz"].map(
              (sede) => (
                <span key={sede}>{sede}</span>
              )
            )}
          </div>
          <p className="text-gray-700" style={{ fontSize: 11 }}>
            LibreChoice · Sistema de Recomendación de Materias de Libre Elección · 2025–II
          </p>
        </footer>
      </div>
    </div>
  );
}
