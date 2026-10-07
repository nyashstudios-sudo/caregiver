"use client";

import { useActionState, useState } from "react";
import { createReviewAction } from "@/lib/actions/reviews";
import type { ActionState } from "@/lib/actions/state";

/** Interactive 1–5 star picker + optional comment for a completed booking. */
export function ReviewForm({
  bookingId,
  targetLabel,
}: {
  bookingId: string;
  targetLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createReviewAction,
    null
  );
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);

  if (state?.ok) {
    return (
      <p className="field-ok">
        ✓ Thanks — your {rating}-star review for {targetLabel} is live.
      </p>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-line bg-surface-2 p-3.5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="mb-2 text-sm font-bold text-ink">
        Review {targetLabel} — how was the experience?
      </p>

      <div
        className="mb-2 flex gap-1 text-2xl"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="Star rating"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={`transition hover:scale-110 ${
              (hover || rating) >= star ? "text-amber-500" : "text-line"
            }`}
            onMouseEnter={() => setHover(star)}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={2}
        maxLength={800}
        className="input mb-2 resize-none"
        placeholder="Punctuality, communication, payment… (optional)"
      />

      {state?.error && <p className="field-error">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
