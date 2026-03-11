"use server";

import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAvailabilityText,
  getBookingData,
} from "@/lib/integrations/doctolib";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AppointmentItem {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  practitioner: string;
  motif: string;
  date: string;
  duration: number;
  status: string;
  source: string;
  notes: string | null;
  externalId: string | null;
  callId: string | null;
  userId: string;
  orgId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStats {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  noShow: number;
  upcoming: number;
}

// ---------------------------------------------------------------------------
// Serialize dates for client transport
// ---------------------------------------------------------------------------
function serializeAppointment(appointment: {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  practitioner: string;
  motif: string;
  date: Date;
  duration: number;
  status: string;
  source: string;
  notes: string | null;
  externalId: string | null;
  callId: string | null;
  userId: string;
  orgId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AppointmentItem {
  return {
    ...appointment,
    date: appointment.date.toISOString(),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Fetch appointments with optional filters
// ---------------------------------------------------------------------------
export async function fetchAppointments(params?: {
  status?: string;
  from?: string;
  to?: string;
}): Promise<AppointmentItem[]> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "appointments:read")) {
    throw new Error("Permission refusee");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  // Org scoping
  const orgF = orgFilter(ctx);
  if (orgF.orgId) {
    conditions.push({ orgId: orgF.orgId });
  }

  // Status filter
  if (params?.status) {
    conditions.push({ status: params.status });
  }

  // Date range
  if (params?.from) {
    conditions.push({ date: { gte: new Date(params.from) } });
  }
  if (params?.to) {
    const endDate = new Date(params.to);
    endDate.setHours(23, 59, 59, 999);
    conditions.push({ date: { lte: endDate } });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return appointments.map(serializeAppointment);
}

// ---------------------------------------------------------------------------
// Create appointment
// ---------------------------------------------------------------------------
export async function createAppointment(data: {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  practitioner: string;
  motif: string;
  date: string;
  duration?: number;
  notes?: string;
  source?: string;
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "appointments:manage")) {
    throw new Error("Permission refusee");
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      patientEmail: data.patientEmail || null,
      practitioner: data.practitioner,
      motif: data.motif,
      date: new Date(data.date),
      duration: data.duration ?? 30,
      notes: data.notes || null,
      source: data.source || "manual",
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
  });

  revalidatePath("/appointments");
  return serializeAppointment(appointment);
}

// ---------------------------------------------------------------------------
// Update appointment status
// ---------------------------------------------------------------------------
export async function updateAppointmentStatus(id: string, status: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "appointments:manage")) {
    throw new Error("Permission refusee");
  }

  const validStatuses = ["confirmed", "cancelled", "completed", "no_show"];
  if (!validStatuses.includes(status)) {
    throw new Error("Statut invalide");
  }

  // Verify ownership
  const existing = await prisma.appointment.findFirst({
    where: { id, ...orgFilter(ctx) },
  });
  if (!existing) {
    throw new Error("Rendez-vous non trouve");
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/appointments");
  return serializeAppointment(appointment);
}

// ---------------------------------------------------------------------------
// Delete appointment
// ---------------------------------------------------------------------------
export async function deleteAppointment(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "appointments:manage")) {
    throw new Error("Permission refusee");
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, ...orgFilter(ctx) },
  });
  if (!existing) {
    throw new Error("Rendez-vous non trouve");
  }

  await prisma.appointment.delete({ where: { id } });

  revalidatePath("/appointments");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get appointment stats
// ---------------------------------------------------------------------------
export async function getAppointmentStats(): Promise<AppointmentStats> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "appointments:read")) {
    throw new Error("Permission refusee");
  }

  const orgF = orgFilter(ctx);
  const baseWhere = orgF.orgId ? { orgId: orgF.orgId } : {};

  const [total, confirmed, cancelled, completed, noShow, upcoming] =
    await Promise.all([
      prisma.appointment.count({ where: baseWhere }),
      prisma.appointment.count({
        where: { ...baseWhere, status: "confirmed" },
      }),
      prisma.appointment.count({
        where: { ...baseWhere, status: "cancelled" },
      }),
      prisma.appointment.count({
        where: { ...baseWhere, status: "completed" },
      }),
      prisma.appointment.count({
        where: { ...baseWhere, status: "no_show" },
      }),
      prisma.appointment.count({
        where: {
          ...baseWhere,
          status: "confirmed",
          date: { gt: new Date() },
        },
      }),
    ]);

  return { total, confirmed, cancelled, completed, noShow, upcoming };
}

// ---------------------------------------------------------------------------
// Doctolib: fetch availabilities text
// ---------------------------------------------------------------------------
export async function fetchDoctolibAvailabilities(
  slug: string,
  visitMotiveName?: string
): Promise<string> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission refusee");
  }

  const text = await getAvailabilityText(slug, visitMotiveName);
  return text;
}

// ---------------------------------------------------------------------------
// Doctolib: fetch booking data (visit motives, practitioner info)
// ---------------------------------------------------------------------------
export async function fetchDoctolibBookingData(slug: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "integrations:manage")) {
    throw new Error("Permission refusee");
  }

  const data = await getBookingData(slug);
  return data;
}
