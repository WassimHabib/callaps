"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getOrganizations() {
  await requireSuperAdmin();
  const users = await prisma.user.findMany({
    where: { approved: true, role: { in: ["client", "admin"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      createdAt: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.company ?? u.name,
    slug: null,
    membersCount: 1,
    createdAt: u.createdAt,
    imageUrl: "",
  }));
}

export async function createOrganization(_formData: FormData) {
  await requireSuperAdmin();
  throw new Error("Utilisez le portail admin pour créer des clients");
}

export async function deleteOrganization(orgId: string) {
  await requireSuperAdmin();
  await prisma.user.delete({ where: { id: orgId } });
  revalidatePath("/admin/organizations");
}

export async function getOrganizationMembers(orgId: string) {
  await requireSuperAdmin();
  const user = await prisma.user.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) return [];
  return [
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      firstName: user.name.split(" ")[0] ?? user.name,
      lastName: user.name.split(" ").slice(1).join(" ") ?? "",
      imageUrl: "",
      role: user.role,
      createdAt: user.createdAt,
    },
  ];
}

export async function addMemberToOrganization(_orgId: string, _formData: FormData) {
  await requireSuperAdmin();
  throw new Error("Utilisez le portail admin pour gérer les accès");
}

export async function removeMemberFromOrganization(_orgId: string, _userId: string) {
  await requireSuperAdmin();
  throw new Error("Utilisez le portail admin pour gérer les accès");
}

export async function updateMemberRole(orgId: string, userId: string, role: string) {
  await requireSuperAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role: role as "client" | "admin" | "super_admin" },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
}
