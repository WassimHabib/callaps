import { Header } from "@/components/layout/header";
import { ProspectList } from "@/components/admin-portal/prospect-list";
import { fetchProspects } from "./actions";

export default async function AdminPortalProspectsPage() {
  const prospects = await fetchProspects();
  return (
    <>
      <Header
        title="Prospects"
        description="Pipeline de conversion"
      />
      <ProspectList initialProspects={prospects} />
    </>
  );
}
