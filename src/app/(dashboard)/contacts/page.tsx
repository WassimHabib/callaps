import { Header } from "@/components/layout/header";
import { PageNav } from "@/components/layout/page-nav";
import { ContactsClient } from "@/components/contacts/contacts-client";
import { fetchContacts, fetchAllTags } from "./actions";

const navItems = [
  { href: "/contacts", label: "Contacts" },
  { href: "/calls", label: "Appels" },
  { href: "/appointments", label: "Rendez-vous" },
];

export default async function ContactsPage() {
  const [contacts, tags] = await Promise.all([
    fetchContacts(),
    fetchAllTags(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Contacts" description="Gérez votre base de contacts CRM" />
      <PageNav items={navItems} />
      <div className="p-8">
        <ContactsClient initialContacts={contacts} allTags={tags} />
      </div>
    </div>
  );
}
