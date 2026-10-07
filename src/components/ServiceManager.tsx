"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  deleteServiceAction,
  saveServiceAction,
  saveServiceEditAction,
  toggleServiceAction,
} from "@/lib/actions/services";
import type { ActionState } from "@/lib/actions/state";
import { formatKES } from "@/lib/format";

export type ServiceItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  priceKes: number;
  durationLabel: string | null;
  active: boolean;
};

const CATEGORY_HINTS = [
  "Childcare",
  "Elder care",
  "Housekeeping",
  "Cooking",
  "Wellness & massage",
  "Tutoring",
  "Laundry & ironing",
  "Errands",
];

/**
 * Service studio — workers publish fixed-price offers clients can book in
 * one tap. Each listing is an editable card: details, price, live toggle.
 */
export function ServiceManager({ services }: { services: ServiceItem[] }) {
  const [createState, createAction, createPending] = useActionState<ActionState, FormData>(
    saveServiceAction,
    null
  );

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Services</h2>
          <p className="text-sm text-muted">
            Fixed-price offers clients can book instantly — like a shop window for your skills.
          </p>
        </div>
        <span className="badge badge-slate shrink-0">{services.length}/20</span>
      </div>

      {/* ── Create ─────────────────────────────────────────────── */}
      <details className="mb-5 rounded-xl border border-line">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-brand">
          + Publish a new service
        </summary>
        <form action={createAction} className="space-y-3 border-t border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sv-title">
                Service title *
              </label>
              <input
                id="sv-title"
                name="title"
                className="input"
                required
                minLength={5}
                maxLength={90}
                placeholder="e.g. Weekly deep house cleaning"
              />
            </div>
            <div>
              <label className="label" htmlFor="sv-category">
                Category *
              </label>
              <input
                id="sv-category"
                name="category"
                className="input"
                required
                list="sv-categories"
                maxLength={60}
                placeholder="Housekeeping"
              />
              <datalist id="sv-categories">
                {CATEGORY_HINTS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="sv-price">
                Price (KES) *
              </label>
              <input
                id="sv-price"
                name="priceKes"
                type="number"
                className="input"
                min={100}
                max={500000}
                step={50}
                required
                placeholder="2500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="sv-duration">
                Delivery time <span className="font-normal text-muted">(shown to clients)</span>
              </label>
              <input
                id="sv-duration"
                name="durationLabel"
                className="input"
                maxLength={60}
                placeholder="e.g. Same day · 4 hours"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="sv-description">
              What&apos;s included *
            </label>
            <textarea
              id="sv-description"
              name="description"
              className="input min-h-24"
              required
              minLength={20}
              maxLength={1500}
              placeholder="Scope, what the client gets, any requirements (items to provide, access, etc.)"
            />
          </div>

          {createState?.error && (
            <p className="field-error" role="alert">
              {createState.error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={createPending}>
            {createPending ? "Publishing…" : "Publish service"}
          </button>
        </form>
      </details>

      {/* ── Existing listings ──────────────────────────────────── */}
      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No services yet. Published offers show up in the marketplace and let clients book
          without negotiating.
        </p>
      ) : (
        <ul className="space-y-3">
          {services.map((svc) => (
            <li key={svc.id} className="rounded-xl border border-line">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{svc.title}</p>
                    <p className="text-xs text-muted">
                      {svc.category}
                      {svc.durationLabel ? ` · ${svc.durationLabel}` : ""} ·{" "}
                      <span className="font-bold text-brand">{formatKES(svc.priceKes)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`badge ${svc.active ? "badge-green" : "badge-slate"}`}>
                      {svc.active ? "Live" : "Hidden"}
                    </span>
                    <span className="text-xs font-semibold text-brand group-open:rotate-180">
                      ▾
                    </span>
                  </div>
                </summary>

                <div className="space-y-3 border-t border-line p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link
                      href={`/services/${svc.slug}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      View public page ↗
                    </Link>
                    <span className="text-muted">/services/{svc.slug}</span>
                  </div>

                  <form action={saveServiceEditAction} className="space-y-3">
                    <input type="hidden" name="id" value={svc.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label">
                          Title
                        </label>
                        <input
                          name="title"
                          className="input"
                          defaultValue={svc.title}
                          required
                          minLength={5}
                          maxLength={90}
                        />
                      </div>
                      <div>
                        <label className="label">Category</label>
                        <input
                          name="category"
                          className="input"
                          defaultValue={svc.category}
                          required
                          maxLength={60}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="label">Price (KES)</label>
                        <input
                          name="priceKes"
                          type="number"
                          className="input"
                          defaultValue={svc.priceKes}
                          min={100}
                          max={500000}
                          step={50}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Delivery time</label>
                        <input
                          name="durationLabel"
                          className="input"
                          defaultValue={svc.durationLabel ?? ""}
                          maxLength={60}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">What&apos;s included</label>
                      <textarea
                        name="description"
                        className="input min-h-20"
                        defaultValue={svc.description}
                        required
                        minLength={20}
                        maxLength={1500}
                      />
                    </div>
                    <input
                      type="hidden"
                      name="active"
                      value={svc.active ? "on" : "off"}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="btn btn-primary !py-2 text-xs">
                        Save changes
                      </button>
                    </div>
                  </form>

                  <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                    <form action={toggleServiceAction}>
                      <input type="hidden" name="id" value={svc.id} />
                      <button type="submit" className="btn btn-secondary !py-2 text-xs">
                        {svc.active ? "Take off shelf" : "Put on shelf"}
                      </button>
                    </form>
                    <form
                      action={deleteServiceAction}
                      onSubmit={(e) => {
                        if (!confirm("Delete this service permanently?")) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={svc.id} />
                      <button
                        type="submit"
                        className="btn btn-danger !border-transparent !bg-transparent !text-red-500 hover:!bg-red-500/10 !py-2 text-xs"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
