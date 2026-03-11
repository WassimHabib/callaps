"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getOrganizations() {
  await requireSuperAdmin();
  const client = await clerkClient();
  const { data: orgs } = await client.organizations.getOrganizationList({
    limit: 100,
    orderBy: "-created_at",
  });
  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    membersCount: org.membersCount,
    createdAt: org.createdAt,
    imageUrl: org.imageUrl,
  }));
}

export async function createOrganization(formData: FormData) {
  await requireSuperAdmin();
  const client = await clerkClient();

  const name = formData.get("name") as string;
  if (!name?.trim()) throw new Error("Le nom est requis");

  const org = await client.organizations.createOrganization({
    name: name.trim(),
    createdBy: undefined as unknown as string, // Admin-created, no specific owner
  });

  revalidatePath("/admin/organizations");
  return { id: org.id, name: org.name, slug: org.slug };
}

export async function deleteOrganization(orgId: string) {
  await requireSuperAdmin();
  const client = await clerkClient();
  await client.organizations.deleteOrganization(orgId);
  revalidatePath("/admin/organizations");
}

export async function getOrganizationMembers(orgId: string) {
  await requireSuperAdmin();
  const client = await clerkClient();
  const { data: members } = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });
  return members.map((m) => ({
    id: m.id,
    userId: m.publicUserData?.userId ?? "",
    email: m.publicUserData?.identifier ?? "",
    firstName: m.publicUserData?.firstName ?? "",
    lastName: m.publicUserData?.lastName ?? "",
    imageUrl: m.publicUserData?.imageUrl ?? "",
    role: m.role,
    createdAt: m.createdAt,
  }));
}

export async function addMemberToOrganization(orgId: string, formData: FormData) {
  await requireSuperAdmin();
  const client = await clerkClient();

  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "org:viewer";

  if (!email?.trim()) throw new Error("L'email est requis");

  // Find user by email in Clerk
  const { data: users } = await client.users.getUserList({
    emailAddress: [email.trim()],
  });

  if (users.length === 0) {
    throw new Error("Aucun utilisateur trouvé avec cet email. L'utilisateur doit d'abord créer un compte.");
  }

  await client.organizations.createOrganizationMembership({
    organizationId: orgId,
    userId: users[0].id,
    role,
  });

  revalidatePath(`/admin/organizations/${orgId}`);
}

export async function removeMemberFromOrganization(orgId: string, userId: string) {
  await requireSuperAdmin();
  const client = await clerkClient();
  await client.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId,
  });
  revalidatePath(`/admin/organizations/${orgId}`);
}

export async function updateMemberRole(orgId: string, userId: string, role: string) {
  await requireSuperAdmin();
  const client = await clerkClient();
  await client.organizations.updateOrganizationMembership({
    organizationId: orgId,
    userId,
    role,
  });
  revalidatePath(`/admin/organizations/${orgId}`);
}
