"use server";

import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  listPhoneNumbers as retellListPhoneNumbers,
  importPhoneNumber as retellImportPhoneNumber,
  updatePhoneNumber as retellUpdatePhoneNumber,
  deletePhoneNumber as retellDeletePhoneNumber,
  createPhoneCall,
} from "@/lib/retell";

export async function fetchPhoneNumbers() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:read")) {
    throw new Error("Permission denied");
  }
  const numbers = await retellListPhoneNumbers();
  return numbers;
}

export async function importPhoneNumberAction(params: {
  phoneNumber: string;
  terminationUri: string;
  nickname?: string;
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  const phoneNumber = await retellImportPhoneNumber({
    phone_number: params.phoneNumber,
    termination_uri: params.terminationUri,
    nickname: params.nickname || undefined,
  });

  revalidatePath("/phone-numbers");
  return phoneNumber;
}

export async function updatePhoneNumberAction(
  phoneNumber: string,
  params: { inbound_agent_id?: string | null; outbound_agent_id?: string | null; nickname?: string }
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }
  const result = await retellUpdatePhoneNumber(phoneNumber, params);
  revalidatePath("/phone-numbers");
  return result;
}

export async function deletePhoneNumberAction(phoneNumber: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }
  await retellDeletePhoneNumber(phoneNumber);
  revalidatePath("/phone-numbers");
}

export async function fetchAgents() {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:read")) {
    throw new Error("Permission denied");
  }
  return prisma.agent.findMany({
    where: { ...orgFilter(ctx) },
    select: { id: true, name: true, retellAgentId: true },
    orderBy: { name: "asc" },
  });
}

export async function makeOutboundCall(params: {
  fromNumber: string;
  agentId: string; // Retell agent ID
  toNumber: string;
}) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "phone_numbers:manage")) {
    throw new Error("Permission denied");
  }

  const result = await createPhoneCall({
    from_number: params.fromNumber,
    to_number: params.toNumber,
    override_agent_id: params.agentId,
  });

  return result;
}
