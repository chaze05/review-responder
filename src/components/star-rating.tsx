"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = value === star;
        const filled = value !== null && star <= value;

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(selected ? null : star)}
            aria-label={selected ? "Clear rating" : `${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={selected}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <Star
              className={`h-5 w-5 ${
                filled ? "fill-amber-400 text-amber-400" : "text-zinc-600"
              }`}
            />
          </button>
        );
      })}
      {value !== null && (
        <span className="ml-2 text-xs text-zinc-500">{value}/5</span>
      )}
    </div>
  );
}
