"use client";

import { useRef, useState, useActionState, useEffect } from "react";
import { sendMessageAction } from "@/lib/actions/messages";

export function MessageComposer({
  receiverId,
  receiverName,
}: {
  receiverId: string;
  receiverName: string;
}) {
  const [state, formAction, pending] = useActionState(sendMessageAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");

  // Clear the draft after a successful send (stateless path redirects away,
  // so this matters for the stateful inline usage).
  useEffect(() => {
    if (state?.ok) setBody("");
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card p-3">
      <input type="hidden" name="receiverId" value={receiverId} />
      <input type="hidden" name="_stateful" value="1" />
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="sr-only">Message {receiverName}</span>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={`Message ${receiverName.split(" ")[0]}…`}
            className="input resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (body.trim() && !pending) formRef.current?.requestSubmit();
              }
            }}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="btn btn-primary h-[52px] shrink-0"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted">
        Enter to send · Shift+Enter for a new line · {2000 - body.length} characters left
      </p>
      {state?.error && <p className="field-error">{state.error}</p>}
    </form>
  );
}
