import { Header } from "@/components/layout/header";
import { ProspectForm } from "@/components/admin-portal/prospect-form";

export default function NewProspectPage() {
  return (
    <>
      <Header
        title="Nouveau Prospect"
        description="Ajoutez un prospect au pipeline"
      />
      <ProspectForm />
    </>
  );
}
