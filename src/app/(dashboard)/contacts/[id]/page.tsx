import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getContactWithHistory } from "../actions";
import { ContactDetailClient } from "@/components/contacts/contact-detail-client";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;

  let contact;
  try {
    contact = await getContactWithHistory(id);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title={contact.name}
        description="Détail du contact"
      />
      <div className="p-8">
        <ContactDetailClient contact={contact} />
      </div>
    </div>
  );
}
