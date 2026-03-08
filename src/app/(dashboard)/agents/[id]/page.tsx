import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { AgentForm } from "@/components/agents/agent-form";
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
    <div>
      <Header title="Modifier l'agent" description={agent.name} />
      <div className="mx-auto max-w-2xl p-6">
        <AgentForm agent={agent} />
      </div>
    </div>
  );
}
