import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

/**
 * Sistema de notificaciones local (localStorage).
 *
 * No hay un modelo `Notification` en el backend de Django — las
 * notificaciones se generan en el cliente a partir de la actividad del
 * usuario (agregar a lista, calificar, solicitudes de materia, etc.) y
 * se persisten en localStorage para que sobrevivan recargas.
 *
 * Si más adelante se quiere un backend real, basta con reemplazar la
 * lectura/escritura de localStorage por llamadas a `/api/notifications`.
 */

export type NotificationType = "info" | "success" | "warning" | "course" | "request";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** ruta interna a la que navega al hacer click, ej. "/my-list" */
  link?: string;
  createdAt: number; // epoch ms
  read: boolean;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  /** Añade una notificación (al inicio de la lista). */
  push: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = "librechoice_notifications";
const MAX_NOTIFICATIONS = 50;

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    /* almacenamiento lleno o no disponible — no romper la app */
  }
}

function seedNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    {
      id: "seed-welcome",
      type: "info",
      title: "¡Bienvenido a LibreChoice!",
      body: "Explora las materias de libre elección y arma tu lista ideal para 2025-II.",
      link: "/explore",
      createdAt: now,
      read: false,
    },
    {
      id: "seed-recommendations",
      type: "course",
      title: "Nuevas recomendaciones disponibles",
      body: "Según tu perfil académico, encontramos materias que podrían interesarte.",
      link: "/",
      createdAt: now - 1000 * 60 * 60 * 2, // hace 2h
      read: false,
    },
    {
      id: "seed-tip",
      type: "warning",
      title: "Completa tu perfil",
      body: "Configura tu carrera e intereses para mejorar las recomendaciones.",
      link: "/profile",
      createdAt: now - 1000 * 60 * 60 * 24, // hace 1 día
      read: false,
    },
  ];
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Cargar del storage (o sembrar la primera vez) al montar
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length === 0) {
      const seed = seedNotifications();
      setNotifications(seed);
      saveToStorage(seed);
    } else {
      setNotifications(stored);
    }
    setHydrated(true);
  }, []);

  // Persistir en cada cambio (después de hidratar)
  useEffect(() => {
    if (hydrated) saveToStorage(notifications);
  }, [notifications, hydrated]);

  const push = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      const item: AppNotification = {
        ...n,
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
    },
    []
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, push, markAllRead, markRead, remove, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  return ctx;
}

/** Formatea un timestamp epoch como "hace 5 min", "hace 2 h", "hace 3 días". */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} días`;
  return new Date(ts).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}
