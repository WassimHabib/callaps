import { Header } from "@/components/layout/header";
import { ClientForm } from "@/components/admin-portal/client-form";

export default function NewClientPage() {
  return (
    <>
      <Header
        title="Nouveau Client"
        description="Créez un compte client"
      />
      <ClientForm />
    </>
  );
}
