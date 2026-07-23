import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Building2,
  Hash,
  GraduationCap,
  FileText,
  AlertCircle,
} from "lucide-react";
import { FACULTADES_UNAL } from "../data/mockUser";
import { useNotifications } from "../context/NotificationsContext";
import { toast } from "sonner";
import { apiFetch } from "../services/api";

/**
 * Modal para solicitar la adición de una materia al catálogo.
 *
 * Si el backend tiene el endpoint `/api/courses/requests` (modelado con
 * CourseRequest), la solicitud se envía allí. Si no está disponible
 * (404 o error de red), se guarda localmente en localStorage para no
 * perderla — el usuario puede verla después y reintentar.
 */

const STORAGE_KEY = "librechoice_course_requests";

export interface CourseRequestData {
  id: string;
  nombre: string;
  codigo: string;
  facultad: string;
  creditos: number;
  nivel: "Pregrado" | "Posgrado";
  modalidad: "presencial" | "virtual" | "híbrida";
  justificacion: string;
  createdAt: number;
  status: "pendiente" | "enviada" | "error";
}

interface CourseRequestModalProps {
  open: boolean;
  onClose: () => void;
}

function loadLocalRequests(): CourseRequestData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRequests(items: CourseRequestData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
}

const inputClass = "w-full rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all";
const inputStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.1)",
};

function Field({
  icon,
  label,
  required,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-gray-400 text-sm mb-1.5">
        {icon}
        {label}
        {required && <span style={{ color: "var(--unal-crimson)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function CourseRequestModal({ open, onClose }: CourseRequestModalProps) {
  const { push } = useNotifications();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    codigo: "",
    facultad: "",
    creditos: 3,
    nivel: "Pregrado" as "Pregrado" | "Posgrado",
    modalidad: "presencial" as "presencial" | "virtual" | "híbrida",
    justificacion: "",
  });

  const set = (field: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const valid = form.nombre.trim().length >= 4 && form.facultad.length > 0 && form.justificacion.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);

    const requestData: CourseRequestData = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim(),
      facultad: form.facultad,
      creditos: form.creditos,
      nivel: form.nivel,
      modalidad: form.modalidad,
      justificacion: form.justificacion.trim(),
      createdAt: Date.now(),
      status: "pendiente",
    };

    // Intentar enviar al backend; si falla, guardar localmente
    try {
      await apiFetch("/courses/requests", {
        method: "POST",
        body: JSON.stringify({
          nombre: requestData.nombre,
          codigo: requestData.codigo,
          facultad: requestData.facultad,
          creditos: requestData.creditos,
          nivel: requestData.nivel,
          modalidad: requestData.modalidad,
          justificacion: requestData.justificacion,
        }),
      });
      requestData.status = "enviada";
      toast.success("Solicitud enviada", {
        description: "El equipo administrativo revisará tu solicitud.",
      });
    } catch {
      // Backend no disponible o endpoint no existe — guardar localmente
      requestData.status = "pendiente";
      const local = loadLocalRequests();
      local.push(requestData);
      saveLocalRequests(local);
      toast.info("Solicitud guardada localmente", {
        description: "Se enviará cuando el servidor esté disponible.",
      });
    }

    // Notificación push
    push({
      type: "request",
      title: "Solicitud de materia enviada",
      body: `"${requestData.nombre}" — pendiente de revisión por el equipo administrativo.`,
      link: "/explore",
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
    // Reset después de la animación de cierre
    setTimeout(() => {
      setSubmitted(false);
      setForm({
        nombre: "",
        codigo: "",
        facultad: "",
        creditos: 3,
        nivel: "Pregrado",
        modalidad: "presencial",
        justificacion: "",
      });
    }, 250);
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
            onClick={handleClose}
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[90] overflow-y-auto rounded-xl"
            style={{
              top: "5vh",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(560px, 92vw)",
              maxHeight: "88vh",
              background: "var(--unal-surface-card)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.9)",
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
              style={{
                background: "var(--unal-surface-card)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(166,34,49,0.15)", color: "var(--unal-crimson)" }}
                >
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="text-white font-semibold" style={{ fontSize: "1.05rem" }}>
                    Solicitar agregar materia
                  </h2>
                  <p className="text-gray-500 text-xs">
                    ¿No encuentras una materia? Pídenos añadirla al catálogo
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <X size={16} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 pt-4">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "rgba(148,180,59,0.15)" }}
                  >
                    <CheckCircle2 size={32} style={{ color: "var(--unal-green)" }} />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">¡Solicitud enviada!</h3>
                  <p className="text-gray-400 text-sm max-w-sm mb-5">
                    Tu solicitud para agregar <span className="text-white font-medium">"{form.nombre}"</span> ha sido
                    registrada. Recibirás una notificación cuando sea revisada por el equipo administrativo.
                  </p>
                  <div
                    className="w-full p-3 rounded-lg flex items-start gap-2 text-left"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <AlertCircle size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Las solicitudes se revisan en un plazo aproximado de 3-5 días hábiles. Mientras tanto,
                      puedes seguir explorando el catálogo actual.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-5 px-6 py-2.5 rounded-lg font-semibold text-white transition-all"
                    style={{ background: "var(--unal-green)" }}
                  >
                    Continuar explorando
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nombre */}
                  <Field icon={<BookOpen size={13} />} label="Nombre de la materia" required>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => set("nombre", e.target.value)}
                      placeholder="Ej: Taller de Fotografía Digital"
                      className={inputClass}
                      style={inputStyle}
                      autoFocus
                    />
                  </Field>

                  {/* Código + Créditos */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={<Hash size={13} />} label="Código (opcional)">
                      <input
                        type="text"
                        value={form.codigo}
                        onChange={(e) => set("codigo", e.target.value)}
                        placeholder="Ej: 2025103"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </Field>
                    <Field icon={<GraduationCap size={13} />} label="Créditos">
                      <select
                        value={form.creditos}
                        onChange={(e) => set("creditos", parseInt(e.target.value))}
                        className={inputClass}
                        style={inputStyle}
                      >
                        {[1, 2, 3, 4, 5, 6].map((c) => (
                          <option key={c} value={c} style={{ background: "#1a1a1a" }}>
                            {c} crédito{c !== 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Facultad */}
                  <Field icon={<Building2 size={13} />} label="Facultad" required>
                    <select
                      value={form.facultad}
                      onChange={(e) => set("facultad", e.target.value)}
                      className={inputClass}
                      style={{ ...inputStyle, color: form.facultad ? "#fff" : "#6b7280" }}
                    >
                      <option value="" style={{ background: "#1a1a1a" }}>
                        Selecciona una facultad
                      </option>
                      {FACULTADES_UNAL.map((f) => (
                        <option key={f} value={f} style={{ background: "#1a1a1a", color: "#fff" }}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Nivel + Modalidad */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={<GraduationCap size={13} />} label="Nivel">
                      <select
                        value={form.nivel}
                        onChange={(e) => set("nivel", e.target.value as "Pregrado" | "Posgrado")}
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="Pregrado" style={{ background: "#1a1a1a" }}>
                          Pregrado
                        </option>
                        <option value="Posgrado" style={{ background: "#1a1a1a" }}>
                          Posgrado
                        </option>
                      </select>
                    </Field>
                    <Field icon={<BookOpen size={13} />} label="Modalidad">
                      <select
                        value={form.modalidad}
                        onChange={(e) => set("modalidad", e.target.value as "presencial" | "virtual" | "híbrida")}
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="presencial" style={{ background: "#1a1a1a" }}>
                          Presencial
                        </option>
                        <option value="virtual" style={{ background: "#1a1a1a" }}>
                          Virtual
                        </option>
                        <option value="híbrida" style={{ background: "#1a1a1a" }}>
                          Híbrida
                        </option>
                      </select>
                    </Field>
                  </div>

                  {/* Justificación */}
                  <Field icon={<FileText size={13} />} label="Justificación" required>
                    <textarea
                      value={form.justificacion}
                      onChange={(e) => set("justificacion", e.target.value)}
                      placeholder="¿Por qué crees que esta materia debería estar en el catálogo de libre elección? (mín. 10 caracteres)"
                      rows={3}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                    />
                    <p className="text-gray-600 text-xs mt-1 text-right">
                      {form.justificacion.length} caracteres
                    </p>
                  </Field>

                  {/* Info note */}
                  <div
                    className="flex items-start gap-2 p-3 rounded-lg"
                    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Tu solicitud será revisada por el equipo administrativo. Si la materia cumple con los
                      criterios de Libre Elección, se agregará al catálogo en la próxima actualización.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!valid || submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
                      style={{
                        background: valid && !submitting ? "var(--unal-green)" : "rgba(255,255,255,0.1)",
                        opacity: valid && !submitting ? 1 : 0.6,
                        cursor: valid && !submitting ? "pointer" : "not-allowed",
                      }}
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Enviar solicitud
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
