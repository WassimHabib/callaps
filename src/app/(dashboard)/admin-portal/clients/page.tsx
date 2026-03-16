import { Header } from "@/components/layout/header";
import { ClientList } from "@/components/admin-portal/client-list";
import { fetchAdminClients } from "./actions";

export default async function AdminPortalClientsPage() {
  const clients = await fetchAdminClients();
  return (
    <>
      <Header
        title="Mes Clients"
        description="Gérez votre portefeuille clients"
      />
      <ClientList initialClients={clients} />
    </>
  );
}
