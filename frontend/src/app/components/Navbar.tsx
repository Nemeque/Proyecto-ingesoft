import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router";
import { Search, Bell, ChevronDown, X, User, Bookmark, LogOut, Check, Trash2, BellOff, BookOpen, Sparkles, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications, formatRelativeTime, type AppNotification } from "../context/NotificationsContext";

const navLinks = [
  { to: "/", label: "Inicio", end: true },
  { to: "/explore", label: "Explorar", end: false },
  { to: "/my-list", label: "Mi Lista", end: false },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const notifIcon: Record<AppNotification["type"], React.ReactNode> = {
  info: <Info size={14} />,
  success: <Check size={14} />,
  warning: <AlertTriangle size={14} />,
  course: <BookOpen size={14} />,
  request: <Sparkles size={14} />,
};

const notifColor: Record<AppNotification["type"], string> = {
  info: "#3b82f6",
  success: "var(--unal-green)",
  warning: "#f59e0b",
  course: "#8b5cf6",
  request: "var(--unal-crimson)",
};

interface NavbarProps {
  onSearch?: (q: string) => void;
}

export function Navbar({ onSearch }: NavbarProps) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead, remove, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza el input con el ?search= de la URL — así el navbar muestra
  // el término activo aunque el usuario venga de un link externo.
  useEffect(() => {
    const q = searchParams.get("search") ?? "";
    if (q !== searchQuery) {
      setSearchQuery(q);
      if (q) setSearchOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Si el padre pasó onSearch (compat con otros layouts), lo llamamos también.
    onSearch?.(value);
    // Debounce: navega a /explore?search=… 350ms después del último tipeo.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      // Si el input quedó vacío, limpia el ?search= de la URL.
      debounceRef.current = setTimeout(() => {
        const next = new URLSearchParams(searchParams);
        next.delete("search");
        navigate(`/explore${next.toString() ? `?${next.toString()}` : ""}`);
      }, 250);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.set("search", value);
      // Aseguramos que estemos en /explore (si el usuario está en Home, lo
      // llevamos a Explore para ver los resultados).
      navigate(`/explore?${next.toString()}`);
    }, 350);
  };

  const handleSearchSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) return;
    const next = new URLSearchParams(searchParams);
    next.set("search", searchQuery);
    navigate(`/explore?${next.toString()}`);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch?.("");
    // Limpia la URL solo si había un ?search= activo.
    if (searchParams.get("search")) {
      const next = new URLSearchParams(searchParams);
      next.delete("search");
      navigate(`/explore${next.toString() ? `?${next.toString()}` : ""}`);
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate("/login");
  };

  const handleNotifClick = (n: AppNotification) => {
    markRead(n.id);
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <nav
      className="fixed top-0 right-0 z-50 px-8 py-4 flex items-center justify-between transition-all duration-500"
      style={{
        left: "64px",
        background: scrolled
          ? "rgba(20,20,20,0.98)"
          : "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)",
        backdropFilter: scrolled ? "blur(8px)" : "none",
      }}
    >
      {/* Mobile logo (only visible when sidebar is hidden) */}
      <div className="flex items-center gap-6 md:hidden">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--unal-green), var(--unal-green-dark))" }}
        >
          <span className="text-white font-black text-xs">UN</span>
        </div>
      </div>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-6">
        {navLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `text-sm transition-colors duration-200 ${
                isActive ? "text-white font-semibold" : "text-gray-300 hover:text-white"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right: search + bell + user */}
      <div className="flex items-center gap-4 ml-auto">
        {searchOpen ? (
          <div
            className="flex items-center gap-2 rounded px-3 py-1.5"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Search size={15} className="text-white flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
                if (e.key === "Escape") handleSearchClose();
              }}
              placeholder="Buscar materias, facultades..."
              className="bg-transparent text-white text-sm outline-none w-52 placeholder-gray-400"
            />
            <button onClick={handleSearchClose} className="flex-shrink-0">
              <X size={15} className="text-gray-400 hover:text-white transition-colors" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <Search size={20} />
          </button>
        )}

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              if (!notifOpen) markAllRead();
            }}
            className="text-white hover:text-gray-300 transition-colors relative"
            title="Notificaciones"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "var(--unal-crimson)", fontSize: 10 }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />
              <div
                className="absolute right-0 top-10 z-50 rounded-lg overflow-hidden shadow-2xl"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  width: "360px",
                  maxWidth: "92vw",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-white" />
                    <span className="text-white text-sm font-semibold">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "var(--unal-crimson)", color: "#fff" }}
                      >
                        {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={markAllRead}
                      title="Marcar todas como leídas"
                      className="p-1.5 rounded hover:bg-white/5 transition-colors"
                    >
                      <Check size={13} className="text-gray-400 hover:text-white" />
                    </button>
                    <button
                      onClick={clearAll}
                      title="Borrar todas"
                      className="p-1.5 rounded hover:bg-white/5 transition-colors"
                    >
                      <Trash2 size={13} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BellOff size={28} className="text-gray-600 mb-2" />
                      <p className="text-gray-400 text-sm">No tienes notificaciones</p>
                      <p className="text-gray-600 text-xs mt-1">
                        Te avisaremos cuando haya novedades
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="w-full text-left px-4 py-3 flex gap-3 hover:bg-white/5 transition-colors relative group"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: n.read ? "transparent" : "rgba(148,180,59,0.05)",
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: notifColor[n.type] + "22",
                            color: notifColor[n.type],
                          }}
                        >
                          {notifIcon[n.type]}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-white text-sm font-semibold leading-tight">
                              {n.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(n.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white flex-shrink-0"
                              title="Descartar"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {n.body && (
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                              {n.body}
                            </p>
                          )}
                          <p className="text-gray-600 mt-1.5" style={{ fontSize: 11 }}>
                            {formatRelativeTime(n.createdAt)}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!n.read && (
                          <span
                            className="absolute top-4 right-3 w-2 h-2 rounded-full"
                            style={{ background: "var(--unal-green)" }}
                          />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div
                    className="px-4 py-2.5 text-center"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/explore");
                      }}
                      className="text-xs hover:underline"
                      style={{ color: "var(--unal-green)" }}
                    >
                      Explorar materias
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 group"
          >
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-xs font-black shadow"
              style={{
                background: "linear-gradient(135deg, var(--unal-crimson), var(--unal-crimson-dark))",
              }}
            >
              <span className="text-white">{getInitials(user?.name ?? "EC")}</span>
            </div>
            <ChevronDown
              size={14}
              className="text-white transition-transform duration-200"
              style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div
                className="absolute right-0 top-10 z-50 rounded-lg overflow-hidden shadow-2xl min-w-48"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-white text-sm font-semibold">{user?.name}</p>
                  <p className="text-gray-400" style={{ fontSize: 12 }}>
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <User size={15} />
                    Mi Perfil
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/my-list"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Bookmark size={15} />
                    Mi Lista
                  </button>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut size={15} />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
