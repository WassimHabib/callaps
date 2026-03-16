import { Header } from "@/components/layout/header";
import { BillingOverview } from "@/components/admin-portal/billing-overview";
import { fetchBillingOverview } from "./actions";

export default async function AdminPortalBillingPage() {
  const data = await fetchBillingOverview();
  return (
    <>
      <Header
        title="Facturation"
        description="Abonnements et factures de vos clients"
      />
      <BillingOverview data={data} />
    </>
  );
}
