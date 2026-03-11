"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteAgent as deleteRetellAgent,
  deleteRetellLlm,
} from "@/lib/retell";

export async function getAdminStats() {
  await requireSuperAdmin();
  const [userCount, agentCount, campaignCount, callCount] = await Promise.all([
    prisma.user.count({ where: { role: "client" } }),
    prisma.agent.count(),
    prisma.campaign.count(),
    prisma.call.count(),
  ]);
  return { userCount, agentCount, campaignCount, callCount };
}

export async function getClients() {
  await requireSuperAdmin();
  return prisma.user.findMany({
    where: { role: "client" },
    include: {
      _count: { select: { campaigns: true, agents: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientDetail(clientId: string) {
  await requireSuperAdmin();
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    include: {
      agents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          published: true,
          retellAgentId: true,
          language: true,
          voiceId: true,
          createdAt: true,
          _count: { select: { campaigns: true } },
        },
      },
      campaigns: {
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { name: true } },
          _count: { select: { contacts: true, calls: true } },
        },
      },
    },
  });
  if (!client) throw new Error("Client not found");
  return client;
}

export async function deleteClient(clientId: string) {
  await requireSuperAdmin();

  // Get all agents to clean up Retell resources
  const agents = await prisma.agent.findMany({
    where: { userId: clientId },
    select: { retellAgentId: true, retellLlmId: true },
  });

  // Clean up Retell resources
  for (const agent of agents) {
    if (agent.retellAgentId) {
      try { await deleteRetellAgent(agent.retellAgentId); } catch { /* ignore */ }
    }
    if (agent.retellLlmId) {
      try { await deleteRetellLlm(agent.retellLlmId); } catch { /* ignore */ }
    }
  }

  // Cascade delete will handle agents, campaigns, etc.
  await prisma.user.delete({ where: { id: clientId } });

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

export async function deleteClientAgent(agentId: string) {
  await requireSuperAdmin();

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { retellAgentId: true, retellLlmId: true, userId: true },
  });
  if (!agent) throw new Error("Agent not found");

  if (agent.retellAgentId) {
    try { await deleteRetellAgent(agent.retellAgentId); } catch { /* ignore */ }
  }
  if (agent.retellLlmId) {
    try { await deleteRetellLlm(agent.retellLlmId); } catch { /* ignore */ }
  }

  await prisma.agent.delete({ where: { id: agentId } });
  revalidatePath(`/admin/clients/${agent.userId}`);
}

export async function deleteClientCampaign(campaignId: string) {
  await requireSuperAdmin();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { userId: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath(`/admin/clients/${campaign.userId}`);
}

export async function approveClient(clientId: string) {
  await requireSuperAdmin();
  await prisma.user.update({
    where: { id: clientId },
    data: { approved: true },
  });
  revalidatePath("/admin/clients");
}

export async function rejectClient(clientId: string) {
  await requireSuperAdmin();
  await prisma.user.update({
    where: { id: clientId },
    data: { approved: false },
  });
  revalidatePath("/admin/clients");
}

export async function updateClientRole(clientId: string, role: "admin" | "client") {
  await requireSuperAdmin();
  await prisma.user.update({
    where: { id: clientId },
    data: { role },
  });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
}
