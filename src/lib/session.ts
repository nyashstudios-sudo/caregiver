import { auth } from "./auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  name: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    role: user.role,
    email: user.email ?? "",
    name: user.name ?? null,
  };
}
