"use client";

import { useActionState } from "react";
import { saveTaxProfileAction } from "@/lib/actions/payments";
import type { ActionState } from "@/lib/actions/state";

/** Worker's KRA PIN — stored on the profile, printed on tax statements. */
export function TaxProfileForm({ kraPin }: { kraPin: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveTaxProfileAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="field-ok" role="status">
        ✓ {state.devCode}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <label className="label" htmlFor="kra-pin">
        KRA PIN (optional, e.g. A123456789X)
      </label>
      <div className="flex gap-2">
        <input
          id="kra-pin"
          name="kraPin"
          className="input uppercase"
          placeholder="A123456789X"
          defaultValue={kraPin ?? ""}
          maxLength={11}
          pattern="[A-Za-z][0-9]{9}[A-Za-z]"
          title="Letter, 9 digits, letter"
        />
        <button type="submit" disabled={pending} className="btn btn-secondary shrink-0">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && <p className="field-error">{state.error}</p>}
    </form>
  );
}
