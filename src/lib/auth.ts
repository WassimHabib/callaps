import { auth } from "@clerk/nextjs/server";

export type UserRole = "admin" | "client";

export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata as { role?: UserRole })?.role || "client";
}

export async function requireAdmin() {
  const role = await getUserRole();
  if (role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}
