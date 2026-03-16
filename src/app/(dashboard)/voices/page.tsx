import { getOrgContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VoiceList } from "@/components/voices/voice-list";

export default async function VoicesPage() {
  const ctx = await getOrgContext();

  const voices = await prisma.clonedVoice.findMany({
    where: {
      OR: [
        ...(ctx.orgId ? [{ orgId: ctx.orgId }] : []),
        { shared: true },
        ...(ctx.isSuperAdmin ? [{}] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const orgVoiceCount = ctx.orgId
    ? await prisma.clonedVoice.count({ where: { orgId: ctx.orgId } })
    : 0;

  const isAdmin = ctx.userRole === "admin" || ctx.userRole === "super_admin";

  return (
    <VoiceList
      voices={voices}
      orgVoiceCount={orgVoiceCount}
      isAdmin={isAdmin}
      currentOrgId={ctx.orgId}
    />
  );
}
