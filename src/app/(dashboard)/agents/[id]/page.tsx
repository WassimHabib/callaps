import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgentSettings } from "@/components/agents/agent-settings";
import { notFound } from "next/navigation";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getOrgContext();

  const agent = await prisma.agent.findFirst({
    where: { id, ...orgFilter(ctx), archived: false },
  });

  if (!agent) notFound();

  // Fetch cloned voices for the voice selector
  const clonedVoices = await prisma.clonedVoice.findMany({
    where: {
      OR: [
        ...(ctx.orgId ? [{ orgId: ctx.orgId }] : []),
        { shared: true },
      ],
    },
    select: { id: true, name: true, retellVoiceId: true, gender: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AgentSettings agent={agent} clonedVoices={clonedVoices} />
    </div>
  );
}
