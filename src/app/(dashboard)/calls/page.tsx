import { Header } from "@/components/layout/header";
import { CallsClient } from "@/components/calls/calls-client";
import { fetchCalls, fetchCampaignsForFilter } from "./actions";

export default async function CallsPage() {
  const [initialData, campaigns] = await Promise.all([
    fetchCalls({ limit: 25, offset: 0 }),
    fetchCampaignsForFilter(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Historique des appels"
        description="Consultez l'historique complet de vos appels et transcriptions"
      />
      <div className="p-8">
        <CallsClient initialData={initialData} campaigns={campaigns} />
      </div>
    </div>
  );
}
