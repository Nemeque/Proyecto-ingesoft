import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { FACULTADES_UNAL, CARRERAS_UNAL } from "../data/mockUser";
import * as authService from "../services/authService";

export function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    carrera: "",
    facultad: "",
    semestre: 1,
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { name, email, password, confirmPassword, carrera, facultad, semestre } = form;
    if (!name || !email || !password || !carrera || !facultad) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await authService.register({ name, email, password, carrera, facultad, semestre });
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Error al registrarse. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all";
  const inputStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" };
  const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "var(--unal-green)");
  const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "rgba(255,255,255,0.1)");

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "var(--unal-surface)" }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 30% 60%, var(--unal-green-dark) 0%, transparent 60%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--unal-green), var(--unal-green-dark))" }}
          >
            <span className="text-white font-black text-sm">UN</span>
          </div>
          <div>
            <div className="text-white font-black text-2xl" style={{ letterSpacing: "-0.02em" }}>
              LibreChoice
            </div>
            <div className="text-gray-400 text-xs tracking-widest uppercase">
              Universidad Nacional de Colombia
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: "var(--unal-surface-card)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h1 className="text-white mb-2" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Crear Cuenta
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Únete y descubre tus materias ideales
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nombre */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Nombre completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Tu nombre"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Correo institucional</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="usuario@unal.edu.co"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass + " pr-12"}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Repite tu contraseña"
                className={inputClass}
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>

            {/* Carrera */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Carrera</label>
              <select
                value={form.carrera}
                onChange={(e) => set("carrera", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, color: form.carrera ? "#fff" : "#6b7280" }}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="" style={{ background: "#1a1a1a" }}>Selecciona tu carrera</option>
                {CARRERAS_UNAL.map((c) => (
                  <option key={c} value={c} style={{ background: "#1a1a1a", color: "#fff" }}>{c}</option>
                ))}
              </select>
            </div>

            {/* Facultad */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Facultad</label>
              <select
                value={form.facultad}
                onChange={(e) => set("facultad", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, color: form.facultad ? "#fff" : "#6b7280" }}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                <option value="" style={{ background: "#1a1a1a" }}>Selecciona tu facultad</option>
                {FACULTADES_UNAL.map((f) => (
                  <option key={f} value={f} style={{ background: "#1a1a1a", color: "#fff" }}>{f}</option>
                ))}
              </select>
            </div>

            {/* Semestre */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Semestre actual</label>
              <select
                value={form.semestre}
                onChange={(e) => set("semestre", parseInt(e.target.value))}
                className={inputClass}
                style={{ ...inputStyle, color: "#fff" }}
                onFocus={focusOn}
                onBlur={focusOff}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s} style={{ background: "#1a1a1a", color: "#fff" }}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm rounded-lg px-3 py-2" style={{ color: "var(--unal-crimson)", background: "rgba(166,34,49,0.1)", border: "1px solid rgba(166,34,49,0.2)" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-all mt-2"
              style={{ background: loading ? "rgba(148,180,59,0.5)" : "var(--unal-green)", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Crear Cuenta
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: "var(--unal-green)" }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
