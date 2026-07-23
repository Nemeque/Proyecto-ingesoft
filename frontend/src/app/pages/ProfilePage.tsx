import { useState } from "react";
import { Link } from "react-router";
import { Save, User, BookOpen, Bookmark, Star, Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { FACULTADES_UNAL, CARRERAS_UNAL } from "../data/mockUser";
import { categories } from "../data/courses";

const ALL_TAGS = [...new Set(
  categories.flatMap((c) => c.courses.flatMap((course) => course.tags))
)].sort();

export function ProfilePage() {
  const { user, updateUser, isLoading } = useAuth();
  const [form, setForm] = useState({
    carrera: user?.carrera ?? "",
    facultad: user?.facultad ?? "",
    semestre: user?.semestre ?? 1,
    intereses: user?.intereses ?? [] as string[],
  });
  const [saved, setSaved] = useState(false);

  const set = (field: string, value: string | number | string[]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleInteres = (tag: string) => {
    const arr = form.intereses;
    set("intereses", arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]);
  };

  const handleSave = async () => {
    await updateUser(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = "w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all";
  const inputStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" };

  return (
    <div
      className="min-h-screen pt-20 px-6 pb-10"
      style={{ background: "var(--unal-surface)" }}
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white mb-1" style={{ fontSize: "1.8rem", fontWeight: 700 }}>
          Mi Perfil
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Tu información académica mejora las recomendaciones personalizadas
        </p>

        {/* Account info */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: "var(--unal-surface-card)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--unal-crimson), var(--unal-crimson-dark))" }}
            >
              <span className="text-white">{(user?.name ?? "EC").slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-white font-semibold">{user?.name}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <p className="text-gray-500 text-xs mt-0.5">ID: {user?.id}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: Bookmark, label: "Mi Lista", value: user?.myList.length ?? 0, to: "/my-list" },
            { icon: Star, label: "Calificadas", value: user?.ratedCourses.length ?? 0, to: null },
            { icon: Eye, label: "Vistas", value: user?.viewedCourses.length ?? 0, to: null },
          ].map(({ icon: Icon, label, value, to }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: "var(--unal-surface-card)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Icon size={20} className="mx-auto mb-1" style={{ color: "var(--unal-green)" }} />
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-gray-400 text-xs">{label}</p>
              {to && (
                <Link to={to} className="text-xs mt-1 block hover:underline" style={{ color: "var(--unal-green)" }}>
                  Ver
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Editable form */}
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--unal-surface-card)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <User size={16} style={{ color: "var(--unal-green)" }} />
            <h2 className="text-white font-semibold">Perfil Académico</h2>
          </div>

          <div className="space-y-4">
            {/* Carrera */}
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Carrera</label>
              <select
                value={form.carrera}
                onChange={(e) => set("carrera", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, color: form.carrera ? "#fff" : "#6b7280" }}
              >
                <option value="" style={{ background: "#1a1a1a" }}>Selecciona tu carrera</option>
                {CARRERAS_UNAL.map((c) => (
                  <option key={c} value={c} style={{ background: "#1a1a1a", color: "#fff" }}>{c}</option>
                ))}
              </select>
            </div>

            {/* Facultad */}
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Facultad</label>
              <select
                value={form.facultad}
                onChange={(e) => set("facultad", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, color: form.facultad ? "#fff" : "#6b7280" }}
              >
                <option value="" style={{ background: "#1a1a1a" }}>Selecciona tu facultad</option>
                {FACULTADES_UNAL.map((f) => (
                  <option key={f} value={f} style={{ background: "#1a1a1a", color: "#fff" }}>{f}</option>
                ))}
              </select>
            </div>

            {/* Semestre */}
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Semestre actual</label>
              <select
                value={form.semestre}
                onChange={(e) => set("semestre", parseInt(e.target.value))}
                className={inputClass}
                style={{ ...inputStyle, color: "#fff" }}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s} style={{ background: "#1a1a1a", color: "#fff" }}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Intereses */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={14} className="text-gray-400" />
                <label className="text-gray-400 text-sm">
                  Intereses académicos{" "}
                  <span className="text-gray-600">
                    ({form.intereses.length} seleccionados)
                  </span>
                </label>
              </div>
              <p className="text-gray-600 text-xs mb-3">
                Selecciona los temas que más te interesan para mejorar tus recomendaciones
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => {
                  const active = form.intereses.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInteres(tag)}
                      className="px-3 py-1.5 rounded-full text-sm transition-all"
                      style={{
                        background: active ? "var(--unal-green)" : "rgba(255,255,255,0.06)",
                        color: active ? "#fff" : "#9ca3af",
                        border: `1px solid ${active ? "var(--unal-green)" : "rgba(255,255,255,0.12)"}`,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all mt-2"
              style={{
                background: saved ? "var(--unal-green-dark)" : "var(--unal-green)",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : saved ? (
                <>✓ Guardado</>
              ) : (
                <>
                  <Save size={16} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
