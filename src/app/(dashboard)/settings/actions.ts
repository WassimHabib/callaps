"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getCompanyProfile() {
  const ctx = await getOrgContext();
  if (!ctx.orgId) return null;

  return prisma.companyProfile.findUnique({
    where: { orgId: ctx.orgId },
  });
}

export async function saveCompanyProfile(data: {
  name: string;
  activity: string;
  description?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  tone?: string;
  targetAudience?: string;
  uniqueValue?: string;
}) {
  const ctx = await getOrgContext();
  if (!ctx.orgId) throw new Error("Organisation requise");

  const profile = await prisma.companyProfile.upsert({
    where: { orgId: ctx.orgId },
    update: {
      name: data.name,
      activity: data.activity,
      description: data.description || null,
      address: data.address || null,
      city: data.city || null,
      zipCode: data.zipCode || null,
      country: data.country || "France",
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      openingHours: data.openingHours || null,
      tone: data.tone || "professionnel",
      targetAudience: data.targetAudience || null,
      uniqueValue: data.uniqueValue || null,
    },
    create: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      name: data.name,
      activity: data.activity,
      description: data.description || null,
      address: data.address || null,
      city: data.city || null,
      zipCode: data.zipCode || null,
      country: data.country || "France",
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      openingHours: data.openingHours || null,
      tone: data.tone || "professionnel",
      targetAudience: data.targetAudience || null,
      uniqueValue: data.uniqueValue || null,
    },
  });

  revalidatePath("/settings");
  return profile;
}
