import { useState } from "react";
import { X } from "lucide-react";

export interface FilterState {
  modality: string[];
  facultad: string;
  difficulty: string[];
  creditsMin: number;
  creditsMax: number;
  withSeatsOnly: boolean;
}

export const defaultFilters: FilterState = {
  modality: [],
  facultad: "",
  difficulty: [],
  creditsMin: 1,
  creditsMax: 4,
  withSeatsOnly: false,
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  facultades: string[];
}

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-sm transition-all duration-150"
      style={{
        background: active ? "var(--unal-green)" : "rgba(255,255,255,0.07)",
        color: active ? "#fff" : "#9ca3af",
        border: `1px solid ${active ? "var(--unal-green)" : "rgba(255,255,255,0.15)"}`,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

const MODALITIES = ["presencial", "virtual", "híbrida"];
const DIFFICULTIES = ["Básico", "Intermedio", "Avanzado"];
const CREDITS = [1, 2, 3, 4];

export function FilterBar({ filters, onChange, facultades }: FilterBarProps) {
  const hasActiveFilters =
    filters.modality.length > 0 ||
    filters.facultad !== "" ||
    filters.difficulty.length > 0 ||
    filters.creditsMin !== 1 ||
    filters.creditsMax !== 4 ||
    filters.withSeatsOnly;

  function toggleArray(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  return (
    <div
      className="sticky z-30 px-6 py-3 flex flex-wrap items-center gap-3"
      style={{
        top: "64px",
        background: "rgba(20,20,20,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Modalidad */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-gray-500 text-xs mr-1">Modalidad:</span>
        {MODALITIES.map((m) => (
          <TogglePill
            key={m}
            label={m.charAt(0).toUpperCase() + m.slice(1)}
            active={filters.modality.includes(m)}
            onClick={() =>
              onChange({ ...filters, modality: toggleArray(filters.modality, m) })
            }
          />
        ))}
      </div>

      {/* Dificultad */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-gray-500 text-xs mr-1">Nivel:</span>
        {DIFFICULTIES.map((d) => (
          <TogglePill
            key={d}
            label={d}
            active={filters.difficulty.includes(d)}
            onClick={() =>
              onChange({ ...filters, difficulty: toggleArray(filters.difficulty, d) })
            }
          />
        ))}
      </div>

      {/* Créditos */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-gray-500 text-xs mr-1">Créditos:</span>
        {CREDITS.map((c) => (
          <TogglePill
            key={c}
            label={`${c} cr`}
            active={filters.creditsMin <= c && c <= filters.creditsMax}
            onClick={() => {
              const selected = CREDITS.filter(
                (x) => filters.creditsMin <= x && x <= filters.creditsMax
              );
              const next = selected.includes(c)
                ? selected.filter((x) => x !== c)
                : [...selected, c].sort();
              if (next.length === 0) return;
              onChange({ ...filters, creditsMin: next[0], creditsMax: next[next.length - 1] });
            }}
          />
        ))}
      </div>

      {/* Facultad */}
      <select
        value={filters.facultad}
        onChange={(e) => onChange({ ...filters, facultad: e.target.value })}
        className="text-sm rounded-full px-3 py-1 outline-none"
        style={{
          background: filters.facultad ? "var(--unal-green)" : "rgba(255,255,255,0.07)",
          color: filters.facultad ? "#fff" : "#9ca3af",
          border: `1px solid ${filters.facultad ? "var(--unal-green)" : "rgba(255,255,255,0.15)"}`,
        }}
      >
        <option value="">Todas las facultades</option>
        {facultades.map((f) => (
          <option key={f} value={f} style={{ background: "#1a1a1a", color: "#fff" }}>
            {f}
          </option>
        ))}
      </select>

      {/* Cupos */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.withSeatsOnly}
          onChange={(e) => onChange({ ...filters, withSeatsOnly: e.target.checked })}
          className="rounded"
          style={{ accentColor: "var(--unal-green)" }}
        />
        <span className="text-gray-400 text-sm">Con cupos</span>
      </label>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange(defaultFilters)}
          className="flex items-center gap-1 text-sm px-3 py-1 rounded-full transition-colors"
          style={{
            color: "var(--unal-crimson)",
            border: "1px solid var(--unal-crimson)",
          }}
        >
          <X size={13} />
          Resetear
        </button>
      )}
    </div>
  );
}
