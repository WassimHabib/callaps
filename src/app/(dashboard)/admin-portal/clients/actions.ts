"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  requireAdminPortal,
  canAccessClient,
  hasMinPermission,
  getAccessibleClientIds,
} from "@/lib/admin-access";
import { sendInviteEmail } from "@/lib/email/invite";

// ---------- List ----------
export async function fetchAdminClients(search?: string, status?: string) {
  const ctx = await requireAdminPortal();
  const isSuperAdmin = ctx.userRole === "super_admin";

  const clientIds = await getAccessibleClientIds(ctx.userId, isSuperAdmin);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { clientId: { in: clientIds } };
  if (status && status !== "all") {
    where.status = status;
  }

  const adminClients = await prisma.adminClient.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          createdAt: true,
        },
      },
      admin: { select: { id: true, name: true } },
      _count: { select: { shares: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (search) {
    const s = search.toLowerCase();
    return adminClients.filter(
      (ac) =>
        ac.client.name.toLowerCase().includes(s) ||
        ac.client.email.toLowerCase().includes(s) ||
        ac.client.company?.toLowerCase().includes(s) ||
        ac.client.phone?.includes(s)
    );
  }

  return adminClients;
}

// ---------- Get single ----------
export async function getAdminClient(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access) throw new Error("Accès refusé");

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
    include: {
      client: true,
      admin: { select: { id: true, name: true, email: true } },
      shares: {
        include: {
          sharedWith: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!adminClient) throw new Error("Client non trouvé");

  return { ...adminClient, currentPermission: access.permission };
}

// ---------- Create ----------
export async function createAdminClient(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}) {
  const ctx = await requireAdminPortal();

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  let clientUser;
  if (existingUser) {
    // Check if already managed by an admin
    const existingRelation = await prisma.adminClient.findFirst({
      where: { clientId: existingUser.id },
    });
    if (existingRelation) {
      throw new Error("Ce client est déjà géré par un administrateur");
    }
    clientUser = existingUser;
  } else {
    // Create new user with invitation token
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    clientUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: "client",
        approved: true,
        company: data.company || null,
        phone: data.phone || null,
        inviteToken,
        inviteExpiresAt,
      },
    });

    // Send invitation email
    await sendInviteEmail({
      to: data.email,
      userName: data.name,
      inviteToken,
      adminName: ctx.userName,
    });
  }

  // Create AdminClient relation
  const adminClient = await prisma.adminClient.create({
    data: {
      adminId: ctx.userId,
      clientId: clientUser.id,
      clientOrgId: clientUser.id, // user.id as orgId fallback
      status: "onboarding",
      contractStatus: "draft",
      paymentStatus: "pending",
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin-portal/clients");
  return adminClient;
}

// ---------- Update ----------
export async function updateAdminClient(
  clientId: string,
  data: {
    status?: string;
    contractStatus?: string;
    contractUrl?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    notes?: string;
  }
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  const updated = await prisma.adminClient.update({
    where: { id: adminClient.id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.contractStatus !== undefined && {
        contractStatus: data.contractStatus,
      }),
      ...(data.contractUrl !== undefined && {
        contractUrl: data.contractUrl || null,
      }),
      ...(data.paymentStatus !== undefined && {
        paymentStatus: data.paymentStatus,
      }),
      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod || null,
      }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });

  revalidatePath("/admin-portal/clients");
  revalidatePath(`/admin-portal/clients/${clientId}`);
  return updated;
}

// ---------- Update client info ----------
export async function updateClientInfo(
  clientId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  await prisma.user.update({
    where: { id: clientId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.company !== undefined && { company: data.company || null }),
    },
  });

  revalidatePath("/admin-portal/clients");
  revalidatePath(`/admin-portal/clients/${clientId}`);
}

// ---------- Delete ----------
export async function deleteAdminClient(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "owner")) {
    throw new Error("Seul le propriétaire peut supprimer un client");
  }

  // Delete AdminClient (cascades to shares)
  await prisma.adminClient.deleteMany({
    where: { clientId },
  });

  revalidatePath("/admin-portal/clients");
}

// ---------- Share ----------
export async function shareClientAccess(
  clientId: string,
  adminEmail: string,
  permission: "read" | "manage"
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "owner")) {
    throw new Error("Seul le propriétaire peut partager l'accès");
  }

  const targetAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, role: "admin" },
  });
  if (!targetAdmin) {
    throw new Error("Administrateur non trouvé avec cet email");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId, adminId: ctx.userId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  await prisma.adminClientShare.upsert({
    where: {
      adminClientId_sharedWithId: {
        adminClientId: adminClient.id,
        sharedWithId: targetAdmin.id,
      },
    },
    update: { permission },
    create: {
      adminClientId: adminClient.id,
      sharedWithId: targetAdmin.id,
      permission,
    },
  });

  revalidatePath(`/admin-portal/clients/${clientId}`);
}

// ---------- Remove share ----------
export async function removeClientShare(shareId: string) {
  const ctx = await requireAdminPortal();

  const share = await prisma.adminClientShare.findUnique({
    where: { id: shareId },
    include: { adminClient: true },
  });
  if (!share) throw new Error("Partage non trouvé");

  const access = await canAccessClient(
    ctx.userId,
    share.adminClient.clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "owner")) {
    throw new Error("Permission insuffisante");
  }

  await prisma.adminClientShare.delete({ where: { id: shareId } });
  revalidatePath(`/admin-portal/clients/${share.adminClient.clientId}`);
}

// ---------- Resend invite ----------
export async function resendClientInvite(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access) throw new Error("Accès refusé");

  const user = await prisma.user.findUnique({ where: { id: clientId } });
  if (!user) throw new Error("Client non trouvé");
  if (user.passwordHash) throw new Error("Ce client a déjà activé son compte");

  const inviteToken = crypto.randomUUID();
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: clientId },
    data: { inviteToken, inviteExpiresAt },
  });

  await sendInviteEmail({
    to: user.email,
    userName: user.name,
    inviteToken,
    adminName: ctx.userName,
  });

  revalidatePath(`/admin-portal/clients/${clientId}`);
}
