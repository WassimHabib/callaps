"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function startImpersonation(orgId: string) {
  await requireSuperAdmin();
  const cookieStore = await cookies();
  cookieStore.set("impersonate_org", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });
  revalidatePath("/");
}

export async function stopImpersonation() {
  await requireSuperAdmin();
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_org");
  revalidatePath("/");
}
