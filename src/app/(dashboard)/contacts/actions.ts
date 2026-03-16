"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Fetch contacts with optional search & tag filter
// ---------------------------------------------------------------------------
export async function fetchContacts(search?: string, tag?: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:read")) {
    throw new Error("Permission denied");
  }

  // Build conditions array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  // Org scope
  const orgF = orgFilter(ctx);
  if (orgF.orgId) {
    conditions.push({ orgId: orgF.orgId });
  }

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (tag) {
    conditions.push({ tags: { has: tag } });
  }

  const contacts = await prisma.contact.findMany({
    where: conditions.length > 0 ? { AND: conditions } : {},
    include: {
      _count: { select: { calls: true } },
      calls: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          summary: true,
          duration: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return contacts;
}

// ---------------------------------------------------------------------------
// Get all unique tags for the current org
// ---------------------------------------------------------------------------
export async function fetchAllTags() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:read")) {
    throw new Error("Permission denied");
  }

  const orgF = orgFilter(ctx);
  const contacts = await prisma.contact.findMany({
    where: orgF.orgId ? { orgId: orgF.orgId } : {},
    select: { tags: true },
  });

  const tagsSet = new Set<string>();
  for (const c of contacts) {
    for (const t of c.tags) {
      tagsSet.add(t);
    }
  }

  return Array.from(tagsSet).sort();
}

// ---------------------------------------------------------------------------
// Create a single contact
// ---------------------------------------------------------------------------
export async function createContact(data: {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:create")) {
    throw new Error("Permission denied");
  }

  const contact = await prisma.contact.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      company: data.company || null,
      tags: data.tags || [],
      notes: data.notes || null,
      userId: ctx.userId,
      orgId: ctx.orgId,
      metadata: {},
    },
  });

  revalidatePath("/contacts");
  return contact;
}

// ---------------------------------------------------------------------------
// Update a contact
// ---------------------------------------------------------------------------
export async function updateContact(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    tags?: string[];
    notes?: string;
    score?: number;
    scoreLabel?: string;
  }
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:update")) {
    throw new Error("Permission denied");
  }

  // Verify ownership
  const existing = await prisma.contact.findFirst({
    where: { id, orgId: orgFilter(ctx).orgId || undefined },
  });
  if (!existing) {
    throw new Error("Contact non trouvé");
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.company !== undefined && { company: data.company || null }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.score !== undefined && { score: data.score }),
      ...(data.scoreLabel !== undefined && { scoreLabel: data.scoreLabel }),
    },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return contact;
}

// ---------------------------------------------------------------------------
// Delete a contact
// ---------------------------------------------------------------------------
export async function deleteContact(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:delete")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.contact.findFirst({
    where: { id, orgId: orgFilter(ctx).orgId || undefined },
  });
  if (!existing) {
    throw new Error("Contact non trouvé");
  }

  await prisma.contact.delete({ where: { id } });

  revalidatePath("/contacts");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Bulk import contacts from CSV data
// ---------------------------------------------------------------------------
export async function importContactsCSV(
  contacts: { name: string; phone: string; email?: string; company?: string }[]
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:create")) {
    throw new Error("Permission denied");
  }

  if (contacts.length === 0) {
    throw new Error("Aucun contact à importer");
  }

  if (contacts.length > 5000) {
    throw new Error("Maximum 5000 contacts par import");
  }

  const result = await prisma.contact.createMany({
    data: contacts.map((c) => ({
      name: c.name || "Inconnu",
      phone: c.phone,
      email: c.email || null,
      company: c.company || null,
      tags: [],
      userId: ctx.userId,
      orgId: ctx.orgId,
      metadata: {},
    })),
    skipDuplicates: true,
  });

  revalidatePath("/contacts");
  return { imported: result.count };
}

// ---------------------------------------------------------------------------
// Add / remove tags
// ---------------------------------------------------------------------------
export async function addTagToContact(id: string, tag: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:update")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.contact.findFirst({
    where: { id, orgId: orgFilter(ctx).orgId || undefined },
  });
  if (!existing) {
    throw new Error("Contact non trouvé");
  }

  const tags = existing.tags.includes(tag) ? existing.tags : [...existing.tags, tag];

  await prisma.contact.update({
    where: { id },
    data: { tags },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function removeTagFromContact(id: string, tag: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:update")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.contact.findFirst({
    where: { id, orgId: orgFilter(ctx).orgId || undefined },
  });
  if (!existing) {
    throw new Error("Contact non trouvé");
  }

  const tags = existing.tags.filter((t) => t !== tag);

  await prisma.contact.update({
    where: { id },
    data: { tags },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Add a note (stored as JSON array in metadata)
// ---------------------------------------------------------------------------
export async function addNoteToContact(id: string, note: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:update")) {
    throw new Error("Permission denied");
  }

  const existing = await prisma.contact.findFirst({
    where: { id, orgId: orgFilter(ctx).orgId || undefined },
  });
  if (!existing) {
    throw new Error("Contact non trouvé");
  }

  const metadata = (existing.metadata as Record<string, unknown>) || {};
  const notes = Array.isArray(metadata.notes) ? metadata.notes : [];
  notes.push({
    text: note,
    author: ctx.userName,
    createdAt: new Date().toISOString(),
  });
  metadata.notes = notes;

  await prisma.contact.update({
    where: { id },
    data: { metadata: metadata as Record<string, unknown> as never },
  });

  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get contact with full call history
// ---------------------------------------------------------------------------
export async function getContactWithHistory(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "contacts:read")) {
    throw new Error("Permission denied");
  }

  const contact = await prisma.contact.findFirst({
    where: { id, orgId: orgFilter(ctx).orgId || undefined },
    include: {
      calls: {
        orderBy: { createdAt: "desc" },
        include: {
          campaign: { select: { id: true, name: true } },
        },
      },
      campaign: { select: { id: true, name: true } },
    },
  });

  if (!contact) {
    throw new Error("Contact non trouvé");
  }

  return contact;
}
