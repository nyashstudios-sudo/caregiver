"use client";

import { useActionState, useState } from "react";
import {
  payBookingAction,
  payBookingFromWalletAction,
  withdrawAction,
  depositAction,
} from "@/lib/actions/payments";
import type { ActionState } from "@/lib/actions/state";

/** STK Push form — pay a booking from a Safaricom number. */
export function PayBookingButton({
  bookingId,
  amount,
  defaultPhone,
}: {
  bookingId: string;
  amount: number;
  defaultPhone: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    payBookingAction,
    null
  );
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return (
      <div className="field-ok" role="status">
        📱 {state.devCode || "Check your phone for the M-Pesa prompt"} — enter your PIN to
        complete KES {amount.toLocaleString()}.
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary w-full">
        Pay KES {amount.toLocaleString()} with M-Pesa
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="label" htmlFor={`pay-phone-${bookingId}`}>
        M-Pesa number
      </label>
      <input
        id={`pay-phone-${bookingId}`}
        name="phone"
        className="input"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0712345678"
        defaultValue={defaultPhone}
        required
      />
      {state?.error && <p className="field-error">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Requesting…" : `Send STK prompt (${amount.toLocaleString()} KES)`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Wallet balance option — pay a booking from funds already on the platform. */
export function PayFromWalletButton({
  bookingId,
  amount,
  balance,
}: {
  bookingId: string;
  amount: number;
  balance: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    payBookingFromWalletAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="field-ok" role="status">
        ✓ {state.devCode}
      </div>
    );
  }

  const covered = balance >= amount;
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state?.error && <p className="field-error">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !covered}
        className="btn btn-secondary w-full"
      >
        {pending
          ? "Paying…"
          : covered
            ? `Pay from wallet (${balance.toLocaleString()} KES available)`
            : `Wallet balance too low (${balance.toLocaleString()} / ${amount.toLocaleString()} KES)`}
      </button>
    </form>
  );
}

/** Wallet deposit form → STK prompt that tops up balance. */
export function DepositForm({ defaultPhone }: { defaultPhone: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(depositAction, null);
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return (
      <div className="field-ok" role="status">
        📱 {state.devCode || "Check your phone for the M-Pesa prompt"} — enter your PIN to top up.
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary w-full">
        Deposit with M-Pesa
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="dep-amount">
          Amount (KES)
        </label>
        <input
          id="dep-amount"
          name="amount"
          type="number"
          min={100}
          max={70000}
          step={1}
          className="input"
          placeholder="1000"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="dep-phone">
          M-Pesa number
        </label>
        <input
          id="dep-phone"
          name="phone"
          className="input"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712345678"
          defaultValue={defaultPhone}
          required
        />
      </div>
      {state?.error && <p className="field-error">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Requesting…" : "Send STK prompt"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
          Cancel
        </button>
      </div>
      <p className="text-xs text-muted">Deposits land in your wallet instantly after you enter your PIN.</p>
    </form>
  );
}

/** Wallet withdrawal form → B2C to M-Pesa. */
export function WithdrawForm({
  balance,
  defaultPhone,
}: {
  balance: number;
  defaultPhone: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    withdrawAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="field-ok" role="status">
        ✓ {state.devCode || "Withdrawal submitted."}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="wd-amount">
          Amount (KES) — you have {balance.toLocaleString()}
        </label>
        <input
          id="wd-amount"
          name="amount"
          type="number"
          min={100}
          max={Math.min(70000, Math.floor(balance))}
          step={1}
          className="input"
          placeholder="1000"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="wd-phone">
          M-Pesa number
        </label>
        <input
          id="wd-phone"
          name="phone"
          className="input"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712345678"
          defaultValue={defaultPhone}
          required
        />
      </div>
      {state?.error && <p className="field-error">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || balance < 100}
        className="btn btn-navy w-full"
      >
        {pending ? "Processing…" : "Withdraw to M-Pesa"}
      </button>
      {balance < 100 && (
        <p className="text-xs text-muted">Minimum withdrawal is KES 100.</p>
      )}
    </form>
  );
}
