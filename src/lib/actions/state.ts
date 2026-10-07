export type ActionState = {
  error?: string;
  ok?: boolean;
  /** Friendly status line (resend notices, verification outcomes). */
  message?: string;
  /** Dev-mode one-time phone code, shown in the UI instead of sending SMS. */
  devCode?: string;
} | null;
