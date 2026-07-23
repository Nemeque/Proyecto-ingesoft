import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "motion/react";

interface StarRatingProps {
  /** Se acepta `number | string | null | undefined` porque algunos
   *  endpoints pueden devolver el rating como cadena (DecimalField de DRF).
   *  Internamente se normaliza a number. */
  rating: number | string | null | undefined;
  onRate?: (n: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

const sizes = {
  sm: 12,
  md: 16,
  lg: 20,
};

export function StarRating({
  rating,
  onRate,
  readonly = false,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const px = sizes[size];
  const interactive = !readonly && !!onRate;
  // Normaliza el rating a number: DecimalField de DRF puede enviar "4.50".
  const safeRating = Number(rating) || 0;
  const displayRating = interactive && hovered > 0 ? hovered : safeRating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= displayRating;
        return (
          <motion.button
            key={n}
            type="button"
            disabled={!interactive}
            whileTap={interactive ? { scale: 1.3 } : {}}
            onMouseEnter={() => interactive && setHovered(n)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onRate?.(n)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: interactive ? "pointer" : "default",
              lineHeight: 1,
            }}
          >
            <Star
              size={px}
              fill={filled ? "var(--unal-green)" : "none"}
              stroke={filled ? "var(--unal-green)" : "#4b5563"}
              strokeWidth={1.5}
            />
          </motion.button>
        );
      })}
      {showValue && (
        <span
          className="text-gray-400 ml-1"
          style={{ fontSize: px - 2 }}
        >
          {safeRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
