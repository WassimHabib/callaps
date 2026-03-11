import { Header } from "@/components/layout/header";
import { ContactsClient } from "@/components/contacts/contacts-client";
import { fetchContacts, fetchAllTags } from "./actions";

export default async function ContactsPage() {
  const [contacts, tags] = await Promise.all([
    fetchContacts(),
    fetchAllTags(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Contacts" description="Gérez votre base de contacts CRM" />
      <div className="p-8">
        <ContactsClient initialContacts={contacts} allTags={tags} />
      </div>
    </div>
  );
}
