import { Header } from "@/components/layout/header";
import { ProspectDetail } from "@/components/admin-portal/prospect-detail";
import { getProspect } from "../actions";
import { notFound } from "next/navigation";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let prospect;
  try {
    prospect = await getProspect(id);
  } catch {
    notFound();
  }

  return (
    <>
      <Header
        title={prospect.name}
        description={prospect.company || prospect.email || "Prospect"}
      />
      <ProspectDetail prospect={prospect} />
    </>
  );
}
