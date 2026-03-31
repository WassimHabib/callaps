import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { fetchPhoneNumbers } from "@/app/(dashboard)/phone-numbers/actions";

export default async function NewCampaignPage() {
  const ctx = await getOrgContext();

  const agents = await prisma.agent.findMany({
    where: { ...orgFilter(ctx), archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Fetch phone numbers scoped to this client
  let phoneNumbers: { id: string; number: string }[] = [];
  try {
    const retellNumbers = await fetchPhoneNumbers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phoneNumbers = retellNumbers.map((pn: any) => ({
      id: pn.phone_number,
      number: pn.phone_number,
    }));
  } catch {
    // If fetch fails, continue without phone numbers
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
