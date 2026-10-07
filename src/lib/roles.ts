/** Pure role helpers shared by middleware (edge) and server actions. */

export function homeForRole(role: string | undefined): string {
  if (role === "WORKER") return "/worker";
  if (role === "ADMIN") return "/dashboard";
  return "/caretakers"; // clients land on the search interface
}

/**
 * Honors a `?next=` redirect target when it is safe (same-site path) and the
 * role is allowed to visit it; otherwise falls back to the role home.
 */
export function safeNext(next: string | null | undefined, role: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    if (next.startsWith("/worker") && role !== "WORKER") return homeForRole(role);
    return next;
  }
  return homeForRole(role);
}
