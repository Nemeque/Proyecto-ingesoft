import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--unal-surface)" }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 60% 40%, var(--unal-green-dark) 0%, transparent 60%)`,
        }}
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

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: "var(--unal-surface-card)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h1 className="text-white mb-2" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Iniciar Sesión
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Accede a tus recomendaciones personalizadas
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Correo institucional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@unal.edu.co"
                className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--unal-green)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none transition-all pr-12"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--unal-green)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-all"
              style={{
                background: loading ? "rgba(148,180,59,0.5)" : "var(--unal-green)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: "var(--unal-green)" }}>
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
