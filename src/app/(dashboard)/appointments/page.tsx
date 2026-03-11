import { Header } from "@/components/layout/header";
import { AppointmentsClient } from "./appointments-client";
import { fetchAppointments, getAppointmentStats } from "./actions";

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
      <div className="p-8">
        <AppointmentsClient
          initialAppointments={appointments}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
