import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { notFound } from "next/navigation";
import { AdminClientDetail } from "@/components/admin/client-detail";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const client = await prisma.user.findUnique({
    where: { id },
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
          llmModel: true,
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

  if (!client) notFound();

  // Get call stats for this client
  const calls = await prisma.call.findMany({
    where: { campaign: { userId: client.id } },
    select: { status: true, duration: true },
  });

  const callStats = {
    total: calls.length,
    completed: calls.filter((c) => c.status === "completed").length,
    failed: calls.filter((c) => c.status === "failed").length,
    totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title={client.name}
        description={`${client.email}${client.company ? ` · ${client.company}` : ""}`}
      />
      <AdminClientDetail client={client} callStats={callStats} />
    </div>
  );
}
