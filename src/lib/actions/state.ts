export type ActionState = {
  error?: string;
  ok?: boolean;
  /** Dev-mode one-time phone code, shown in the UI instead of sending SMS. */
  devCode?: string;
} | null;
