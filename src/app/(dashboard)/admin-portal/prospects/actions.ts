"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { requireAdminPortal } from "@/lib/admin-access";
import { sendInviteEmail } from "@/lib/email/invite";

const STAGES = [
  "prospect",
  "contacted",
  "demo_scheduled",
  "demo_done",
  "proposal_sent",
  "negotiation",
  "converted",
  "lost",
] as const;

// ---------- List ----------
export async function fetchProspects(search?: string, stage?: string, source?: string) {
  const ctx = await requireAdminPortal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (ctx.userRole !== "super_admin") {
    where.adminId = ctx.userId;
  }

  if (stage && stage !== "all") {
    where.stage = stage;
  }
  if (source && source !== "all") {
    where.source = source;
  }

  const prospects = await prisma.prospect.findMany({
    where,
    include: {
      _count: { select: { activities: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (search) {
    const s = search.toLowerCase();
    return prospects.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.company?.toLowerCase().includes(s) ||
        p.phone?.includes(s) ||
        p.email?.toLowerCase().includes(s)
    );
  }

  return prospects;
}

// ---------- Get single ----------
export async function getProspect(id: string) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      activities: {
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      convertedTo: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!prospect) throw new Error("Prospect non trouvé");

  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  return prospect;
}

// ---------- Create ----------
export async function createProspect(data: {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
  estimatedValue?: number;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
}) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.create({
    data: {
      adminId: ctx.userId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      company: data.company || null,
      source: data.source || "manual",
      estimatedValue: data.estimatedValue || null,
      nextAction: data.nextAction || null,
      nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin-portal/prospects");
  return prospect;
}

// ---------- Update ----------
export async function updateProspect(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    source?: string;
    estimatedValue?: number | null;
    nextAction?: string;
    nextActionDate?: string | null;
    notes?: string;
    lostReason?: string;
  }
) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect) throw new Error("Prospect non trouvé");
  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  await prisma.prospect.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.company !== undefined && { company: data.company || null }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.estimatedValue !== undefined && { estimatedValue: data.estimatedValue }),
      ...(data.nextAction !== undefined && { nextAction: data.nextAction || null }),
      ...(data.nextActionDate !== undefined && {
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.lostReason !== undefined && { lostReason: data.lostReason || null }),
    },
  });

  revalidatePath("/admin-portal/prospects");
  revalidatePath(`/admin-portal/prospects/${id}`);
}

// ---------- Advance stage ----------
export async function advanceProspectStage(id: string) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect) throw new Error("Prospect non trouvé");
  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  const currentIndex = STAGES.indexOf(prospect.stage as typeof STAGES[number]);
  if (currentIndex === -1 || currentIndex >= STAGES.indexOf("negotiation")) {
    throw new Error("Impossible d'avancer l'étape");
  }

  const nextStage = STAGES[currentIndex + 1];

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id },
      data: { stage: nextStage },
    }),
    prisma.prospectActivity.create({
      data: {
        prospectId: id,
        type: "stage_change",
        description: `Étape avancée : ${prospect.stage} → ${nextStage}`,
        authorId: ctx.userId,
      },
    }),
  ]);

  revalidatePath("/admin-portal/prospects");
  revalidatePath(`/admin-portal/prospects/${id}`);
}

// ---------- Mark lost ----------
export async function markProspectLost(id: string, reason: string) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect) throw new Error("Prospect non trouvé");
  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id },
      data: { stage: "lost", lostReason: reason },
    }),
    prisma.prospectActivity.create({
      data: {
        prospectId: id,
        type: "stage_change",
        description: `Marqué comme perdu : ${reason}`,
        authorId: ctx.userId,
      },
    }),
  ]);

  revalidatePath("/admin-portal/prospects");
  revalidatePath(`/admin-portal/prospects/${id}`);
}

// ---------- Add activity ----------
export async function addProspectActivity(
  prospectId: string,
  type: string,
  description: string
) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospect non trouvé");
  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  await prisma.prospectActivity.create({
    data: {
      prospectId,
      type,
      description,
      authorId: ctx.userId,
    },
  });

  revalidatePath(`/admin-portal/prospects/${prospectId}`);
}

// ---------- Convert to client ----------
export async function convertProspectToClient(prospectId: string) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospect non trouvé");
  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  // Check if email already exists
  let clientUser;
  if (prospect.email) {
    const existing = await prisma.user.findUnique({
      where: { email: prospect.email },
    });
    if (existing) {
      // Check if already managed
      const existingRelation = await prisma.adminClient.findFirst({
        where: { clientId: existing.id },
      });
      if (existingRelation) {
        throw new Error("Un client avec cet email existe déjà");
      }
      clientUser = existing;
    }
  }

  if (!clientUser) {
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    clientUser = await prisma.user.create({
      data: {
        email: prospect.email || `prospect_${prospectId}@placeholder.local`,
        name: prospect.name,
        role: "client",
        approved: true,
        company: prospect.company || null,
        phone: prospect.phone || null,
        inviteToken,
        inviteExpiresAt,
      },
    });

    // Send invitation email if prospect has a real email
    if (prospect.email) {
      await sendInviteEmail({
        to: prospect.email,
        userName: prospect.name,
        inviteToken,
        adminName: ctx.userName,
      });
    }
  }

  await prisma.$transaction([
    prisma.adminClient.create({
      data: {
        adminId: ctx.userId,
        clientId: clientUser.id,
        clientOrgId: clientUser.id,
        status: "onboarding",
        contractStatus: "draft",
        paymentStatus: "pending",
      },
    }),
    prisma.prospect.update({
      where: { id: prospectId },
      data: {
        stage: "converted",
        convertedToId: clientUser.id,
      },
    }),
    prisma.prospectActivity.create({
      data: {
        prospectId,
        type: "stage_change",
        description: `Converti en client : ${clientUser.name}`,
        authorId: ctx.userId,
      },
    }),
  ]);

  revalidatePath("/admin-portal/prospects");
  revalidatePath("/admin-portal/clients");
  revalidatePath(`/admin-portal/prospects/${prospectId}`);

  return clientUser.id;
}

// ---------- Delete ----------
export async function deleteProspect(id: string) {
  const ctx = await requireAdminPortal();

  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect) throw new Error("Prospect non trouvé");
  if (ctx.userRole !== "super_admin" && prospect.adminId !== ctx.userId) {
    throw new Error("Accès refusé");
  }

  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/admin-portal/prospects");
}
