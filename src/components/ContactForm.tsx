"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/lib/actions/contact";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    sendContactMessage,
    null
  );

  if (state?.ok) {
    return (
      <div className="card p-6 sm:p-8">
        <p className="text-xl font-bold text-ink">Asante sana! 🙏</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your message has reached our team in Nairobi. We typically respond within one business
          day — sooner on weekdays.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 p-5 sm:p-6">
      {/* Honeypot — hidden from humans, tempting for bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact-name">
            Your name
          </label>
          <input
            className="input"
            id="contact-name"
            name="name"
            required
            autoComplete="name"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact-email">
            Email
          </label>
          <input
            className="input"
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact-phone">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            className="input"
            id="contact-phone"
            name="phone"
            type="tel"
            placeholder="+254 712 345 678"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact-subject">
            Subject
          </label>
          <input
            className="input"
            id="contact-subject"
            name="subject"
            placeholder="e.g. Question about bookings"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          className="input"
          id="contact-message"
          name="message"
          rows={5}
          required
          maxLength={3000}
          placeholder="How can we help?"
        />
      </div>

      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
