import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { listPhoneNumbers } from "@/lib/retell";

export default async function NewCampaignPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Fetch phone numbers from Retell
  let phoneNumbers: { id: string; number: string }[] = [];
  try {
    const retellNumbers = await listPhoneNumbers();
    phoneNumbers = retellNumbers.map((pn: { phone_number: string; nickname?: string }) => ({
      id: pn.phone_number,
      number: pn.phone_number,
    }));
  } catch {
    // If Retell fails, continue without phone numbers
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Nouvelle campagne"
        description="Configurez votre campagne d'appels"
      />
      <CampaignForm agents={agents} phoneNumbers={phoneNumbers} />
    </div>
  );
}
