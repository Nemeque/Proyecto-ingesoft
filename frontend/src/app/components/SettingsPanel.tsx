import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Settings,
  Bell,
  User,
  LogOut,
  Info,
  Github,
  Palette,
  Volume2,
  Eye,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { toast } from "sonner";

/**
 * Panel de Configuración rápida.
 *
 * Se abre desde el ícono de engranaje del Sidebar. Reemplaza al antiguo
 * NavLink que simplemente saltaba a /profile — ahora el engranaje abre un
 * panel lateral con preferencias de notificaciones, visualización, acceso
 * rápido a la cuenta y enlace al perfil completo.
 *
 * Las preferencias se persisten en localStorage (no hay modelo en el
 * backend para esto aún; si se quiere sincronizar entre dispositivos,
 * habría que añadir un campo JSON `preferences` al modelo User).
 */

const PREFS_KEY = "librechoice_prefs";

export interface UserPreferences {
  notifEnabled: boolean;
  notifSound: boolean;
  notifCourseUpdates: boolean;
  notifRecommendations: boolean;
  reduceMotion: boolean;
  compactView: boolean;
  showMatchPercent: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  notifEnabled: true,
  notifSound: false,
  notifCourseUpdates: true,
  notifRecommendations: true,
  reduceMotion: false,
  compactView: false,
  showMatchPercent: true,
};

function loadPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: UserPreferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
      style={{
        background: checked ? "var(--unal-green)" : "rgba(255,255,255,0.15)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Row({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", color: "var(--unal-green)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-5 mb-1"
      style={{ letterSpacing: "0.08em" }}
    >
      {children}
    </p>
  );
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { user, logout } = useAuth();
  const { push } = useNotifications();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, [open]);

  const update = (patch: Partial<UserPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login");
  };

  const goToProfile = () => {
    onClose();
    navigate("/profile");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-[70] h-full overflow-y-auto"
            style={{
              width: "min(420px, 92vw)",
              background: "var(--unal-surface)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{
                background: "var(--unal-surface)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <Settings size={18} style={{ color: "var(--unal-green)" }} />
                <h2 className="text-white font-semibold" style={{ fontSize: "1.05rem" }}>
                  Configuración
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <X size={16} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-8">
              {/* Account card */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl mt-4"
                style={{
                  background: "var(--unal-surface-card)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--unal-crimson), var(--unal-crimson-dark))" }}
                >
                  <span className="text-white">{(user?.name ?? "EC").slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                  <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                </div>
                <button
                  onClick={goToProfile}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                  title="Ver perfil completo"
                >
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Notifications */}
              <SectionTitle>Notificaciones</SectionTitle>
              <Row
                icon={<Bell size={14} />}
                label="Activar notificaciones"
                description="Recibir avisos en el ícono de la campana"
              >
                <Toggle
                  checked={prefs.notifEnabled}
                  onChange={(v) => {
                    update({ notifEnabled: v });
                    if (v) {
                      push({
                        type: "success",
                        title: "Notificaciones activadas",
                        body: "Recibirás avisos en la campana de la barra superior.",
                      });
                      toast.success("Notificaciones activadas");
                    } else {
                      toast.info("Notificaciones desactivadas");
                    }
                  }}
                />
              </Row>
              <Row
                icon={<Volume2 size={14} />}
                label="Sonido de notificación"
                description="Reproducir un sonido al recibir avisos"
              >
                <Toggle
                  checked={prefs.notifSound && prefs.notifEnabled}
                  disabled={!prefs.notifEnabled}
                  onChange={(v) => update({ notifSound: v })}
                />
              </Row>
              <Row
                icon={<Sparkles size={14} />}
                label="Nuevas recomendaciones"
                description="Avisar cuando haya materias recomendadas"
              >
                <Toggle
                  checked={prefs.notifRecommendations && prefs.notifEnabled}
                  disabled={!prefs.notifEnabled}
                  onChange={(v) => update({ notifRecommendations: v })}
                />
              </Row>
              <Row
                icon={<Info size={14} />}
                label="Actualizaciones de materias"
                description="Cambios en cupos, horarios o nuevas materias"
              >
                <Toggle
                  checked={prefs.notifCourseUpdates && prefs.notifEnabled}
                  disabled={!prefs.notifEnabled}
                  onChange={(v) => update({ notifCourseUpdates: v })}
                />
              </Row>

              {/* Visualización */}
              <SectionTitle>Visualización</SectionTitle>
              <Row
                icon={<Palette size={14} />}
                label="Reducir animaciones"
                description="Menos movimiento en transiciones"
              >
                <Toggle checked={prefs.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
              </Row>
              <Row
                icon={<Eye size={14} />}
                label="Vista compacta"
                description="Tarjetas más pequeñas en el catálogo"
              >
                <Toggle checked={prefs.compactView} onChange={(v) => update({ compactView: v })} />
              </Row>
              <Row
                icon={<Sparkles size={14} />}
                label="Mostrar % de afinidad"
                description="Ver el porcentaje de match en cada materia"
              >
                <Toggle checked={prefs.showMatchPercent} onChange={(v) => update({ showMatchPercent: v })} />
              </Row>

              {/* Account actions */}
              <SectionTitle>Cuenta</SectionTitle>
              <button
                onClick={goToProfile}
                className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-white/5 -mx-1 px-3 rounded-lg transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--unal-green)" }}
                >
                  <User size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Editar perfil académico</p>
                  <p className="text-gray-500 text-xs mt-0.5">Carrera, facultad, intereses</p>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-3 px-3 -mx-1 rounded-lg transition-colors hover:bg-white/5 text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(166,34,49,0.15)", color: "var(--unal-crimson)" }}
                >
                  <LogOut size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--unal-crimson)" }}>
                    Cerrar sesión
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">Salir de tu cuenta</p>
                </div>
              </button>

              {/* About */}
              <SectionTitle>Acerca de</SectionTitle>
              <div
                className="rounded-xl p-4 mt-2"
                style={{
                  background: "var(--unal-surface-card)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--unal-green), var(--unal-green-dark))" }}
                  >
                    <span className="text-white font-black" style={{ fontSize: 9 }}>
                      UN
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">LibreChoice</p>
                    <p className="text-gray-500 text-xs">Versión 1.0.0 · Sprint 3</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed mb-3">
                  Sistema de recomendación de materias de Libre Elección para la Universidad
                  Nacional de Colombia. Proyecto académico de Ingeniería de Software.
                </p>
                <a
                  href="https://sia.unal.edu.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs hover:underline"
                  style={{ color: "var(--unal-green)" }}
                >
                  <Github size={12} />
                  Catálogo SIA oficial
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
