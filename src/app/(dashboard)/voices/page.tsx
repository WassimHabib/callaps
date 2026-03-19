import { getOrgContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { PageNav } from "@/components/layout/page-nav";
import { VoiceList } from "@/components/voices/voice-list";

const navItems = [
  { href: "/agents", label: "Agents" },
  { href: "/voices", label: "Voix clonées" },
];

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
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Voix clonées" description="Gérez vos voix personnalisées" />
      <PageNav items={navItems} />
      <div className="p-8">
        <VoiceList
          voices={voices}
          orgVoiceCount={orgVoiceCount}
          isAdmin={isAdmin}
          currentOrgId={ctx.orgId}
        />
      </div>
    </div>
  );
}
