"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPortal, canAccessClient } from "@/lib/admin-access";

export async function startAdminImpersonation(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access) {
    throw new Error("Accès refusé à ce client");
  }

  const cookieStore = await cookies();
  cookieStore.set("impersonate_org", clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  revalidatePath("/");
  redirect("/dashboard");
}

export async function stopAdminImpersonation() {
  await requireAdminPortal();
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_org");
  revalidatePath("/");
  redirect("/admin-portal/clients");
}
