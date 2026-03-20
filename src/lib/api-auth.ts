import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export function generateApiKey(): string {
  return `clps_${crypto.randomBytes(32).toString("hex")}`;
}

export async function validateApiKey(key: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: { select: { id: true, role: true } } },
  });

  if (!apiKey || !apiKey.active) return null;

  // Update last used (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  return {
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    orgId: apiKey.orgId,
    userRole: apiKey.user.role,
  };
}
