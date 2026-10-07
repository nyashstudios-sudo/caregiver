/** Pure role helpers shared by middleware (edge) and server actions. */

export function homeForRole(role: string | undefined): string {
  if (role === "WORKER") return "/worker";
  if (role === "ADMIN") return "/admin"; // admins live in the command center
  return "/caretakers"; // clients land on the search interface
}

/** Client/worker surfaces admins are deliberately kept out of. */
function isAdminOnlyBarrier(next: string, role: string | undefined): boolean {
  if (role !== "ADMIN") return false;
  return (
    next === "/dashboard" ||
    next.startsWith("/dashboard/") ||
    next === "/worker" ||
    next.startsWith("/worker/") ||
    next === "/wallet" ||
    next.startsWith("/wallet/")
  );
}

/**
 * Honors a `?next=` redirect target when it is safe (same-site path) and the
 * role is allowed to visit it; otherwise falls back to the role home.
 */
export function safeNext(next: string | null | undefined, role: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    if (next.startsWith("/worker") && role !== "WORKER") return homeForRole(role);
    if (next.startsWith("/admin") && role !== "ADMIN") return homeForRole(role);
    if (isAdminOnlyBarrier(next, role)) return homeForRole(role);
    return next;
  }
  return homeForRole(role);
}
