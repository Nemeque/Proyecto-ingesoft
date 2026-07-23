import { useState } from "react";
import { NavLink } from "react-router";
import { Home, Compass, Bookmark, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SettingsPanel } from "./SettingsPanel";

const navItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/explore", icon: Compass, label: "Explorar" },
  { to: "/my-list", icon: Bookmark, label: "Mi Lista" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function Sidebar() {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside
        className="hidden md:flex flex-col items-center py-6 gap-2 flex-shrink-0"
        style={{
          width: "64px",
          background: "rgba(20,20,20,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 40,
        }}
      >
        {/* Logo mini */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--unal-green), var(--unal-green-dark))" }}
        >
          <span className="text-white font-black text-xs">UN</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              title={label}
              className={({ isActive }) =>
                [
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
                  isActive
                    ? "bg-white/10"
                    : "hover:bg-white/5",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                      style={{ background: "var(--unal-green)" }}
                    />
                  )}
                  <Icon
                    size={18}
                    style={{ color: isActive ? "var(--unal-green)" : "#9ca3af" }}
                  />
                  {/* Tooltip */}
                  <span
                    className="absolute left-14 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: settings + avatar */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <button
            onClick={() => setSettingsOpen(true)}
            title="Configuración"
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all group relative"
          >
            <Settings size={18} className="text-gray-400 group-hover:rotate-45 transition-transform duration-300" />
            <span className="absolute left-14 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Configuración
            </span>
          </button>

          <NavLink
            to="/profile"
            title={user?.name ?? "Perfil"}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 group relative"
            style={{ background: "linear-gradient(135deg, var(--unal-crimson), var(--unal-crimson-dark))" }}
          >
            <span className="text-white">{getInitials(user?.name ?? "EC")}</span>
            <span className="absolute left-14 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {user?.name}
            </span>
          </NavLink>
        </div>
      </aside>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
