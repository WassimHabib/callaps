"use server";

import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";

export async function fetchApiKeys() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:read")) {
    throw new Error("Permission denied");
  }

  return prisma.apiKey.findMany({
    where: { ...orgFilter(ctx), userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      active: true,
      lastUsed: true,
      createdAt: true,
    },
  });
}

export async function createApiKeyAction(name: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  if (!name.trim()) {
    throw new Error("Le nom est requis");
  }

  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      key,
      orgId: ctx.orgId!,
      userId: ctx.userId,
    },
    select: {
      id: true,
      name: true,
      key: true,
      active: true,
      lastUsed: true,
      createdAt: true,
    },
  });

  revalidatePath("/integrations");

  return apiKey;
}

export async function revokeApiKey(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!existing) throw new Error("Clé API non trouvée");

  await prisma.apiKey.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath("/integrations");
}

export async function deleteApiKey(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!existing) throw new Error("Clé API non trouvée");

  await prisma.apiKey.delete({ where: { id } });

  revalidatePath("/integrations");
}
