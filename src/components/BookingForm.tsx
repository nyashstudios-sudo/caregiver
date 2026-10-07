"use client";

import { useActionState, useEffect, useState } from "react";
import { createBookingAction, type BookingState } from "@/lib/actions/bookings";

/**
 * "Book Caretaker" action form shown on worker profile views. When a fixed
 * price `service` is passed the form books that listing instead of the
 * hourly rate — price comes from the server either way.
 */
export function BookingForm({
  workerId,
  workerName,
  service,
}: {
  workerId: string;
  workerName: string;
  service?: { id: string; title: string; priceKes: number; durationLabel?: string | null };
}) {
  const [state, formAction, pending] = useActionState<BookingState, FormData>(
    createBookingAction,
    null
  );
  const [when, setWhen] = useState("");

  useEffect(() => {
    // Default to tomorrow at 09:00 local time.
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    setWhen(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }, []);

  return (
    <form action={formAction} className="card p-5">
      <h2 className="mb-1 text-lg font-bold text-ink">
        {service ? `Book “${service.title}”` : `Book ${workerName}`}
      </h2>
      {service ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <span className="text-xl font-extrabold text-brand">
            KES {service.priceKes.toLocaleString("en-GB")}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            fixed price{service.durationLabel ? ` · ${service.durationLabel}` : ""}
          </span>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Send a booking request — it starts as <strong>PENDING</strong> until the caretaker
          accepts it.
        </p>
      )}

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="serviceDate">
            Service date &amp; time
          </label>
          <input
            className="input"
            id="serviceDate"
            name="serviceDate"
            type="datetime-local"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </div>
        {!service && (
          <div>
            <label className="label" htmlFor="hours">
              Hours
            </label>
            <input
              className="input"
              id="hours"
              name="hours"
              type="number"
              min={1}
              max={12}
              step={1}
              defaultValue={4}
              required
            />
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="label" htmlFor="notes">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          className="input"
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="What do you need help with?"
        />
      </div>

      <input type="hidden" name="workerId" value={workerId} />
      {service && <input type="hidden" name="serviceId" value={service.id} />}

      <button type="submit" className="btn btn-navy w-full" disabled={pending}>
        {pending ? "Booking…" : service ? "Book this service" : "Request booking"}
      </button>
    </form>
  );
}
