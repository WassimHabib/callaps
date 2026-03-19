import { Header } from "@/components/layout/header";
import { PageNav } from "@/components/layout/page-nav";
import { AppointmentsClient } from "./appointments-client";
import { fetchAppointments, getAppointmentStats } from "./actions";

const navItems = [
  { href: "/contacts", label: "Contacts" },
  { href: "/calls", label: "Appels" },
  { href: "/appointments", label: "Rendez-vous" },
];

export default async function AppointmentsPage() {
  const [appointments, stats] = await Promise.all([
    fetchAppointments(),
    getAppointmentStats(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Rendez-vous"
        description="Gerez les rendez-vous pris par vos agents IA"
      />
      <PageNav items={navItems} />
      <div className="p-8">
        <AppointmentsClient
          initialAppointments={appointments}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
