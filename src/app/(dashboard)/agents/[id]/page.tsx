import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgentSettings } from "@/components/agents/agent-settings";
import { notFound } from "next/navigation";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const agent = await prisma.agent.findFirst({
    where: { id, userId: user.id },
  });

  if (!agent) notFound();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AgentSettings agent={agent} />
    </div>
  );
}
