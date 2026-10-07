"use client";

import { useActionState, useEffect, useState } from "react";
import { createBookingAction, type BookingState } from "@/lib/actions/bookings";

/** "Book Caretaker" action form shown on worker profile views. */
export function BookingForm({
  workerId,
  workerName,
}: {
  workerId: string;
  workerName: string;
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
      <h2 className="mb-1 text-lg font-bold text-ink">Book {workerName}</h2>
      <p className="mb-4 text-sm text-muted">
        Send a booking request — it starts as <strong>PENDING</strong> until the caretaker
        accepts it.
      </p>

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

      <button type="submit" className="btn btn-navy w-full" disabled={pending}>
        {pending ? "Booking…" : "Request booking"}
      </button>
    </form>
  );
}
