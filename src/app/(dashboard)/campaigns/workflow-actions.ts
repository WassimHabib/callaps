"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { WorkflowRule } from "@/lib/workflows";

export async function updateCampaignWorkflows(
  campaignId: string,
  workflows: WorkflowRule[]
) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:update")) {
    throw new Error("Permission denied");
  }

  await prisma.campaign.update({
    where: { id: campaignId, ...orgFilter(ctx) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { workflows: JSON.parse(JSON.stringify(workflows)) as any },
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function getCampaignWorkflows(
  campaignId: string
): Promise<WorkflowRule[]> {
  const ctx = await getOrgContext();
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ...orgFilter(ctx) },
    select: { workflows: true },
  });
  return (campaign?.workflows as unknown as WorkflowRule[]) || [];
}
