"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Plus,
  Phone,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Trash2,
} from "lucide-react";
import type { AppointmentItem, AppointmentStats } from "./actions";
import {
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  fetchDoctolibAvailabilities,
} from "./actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDateFR(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
  const months = [
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
  ];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dayName} ${day} ${month} ${year} a ${hours}h${minutes}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Confirme";
    case "cancelled":
      return "Annule";
    case "completed":
      return "Termine";
    case "no_show":
      return "Absent";
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    case "no_show":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case "agent_ia":
      return "Agent IA";
    case "manual":
      return "Manuel";
    case "doctolib_sync":
      return "Doctolib";
    default:
      return source;
  }
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------
function StatsBar({ stats }: { stats: AppointmentStats }) {
  const cards = [
    {
      label: "Total RDV",
      value: stats.total,
      icon: Calendar,
      gradient: "from-indigo-500 to-violet-500",
      shadow: "shadow-indigo-500/25",
    },
    {
      label: "Confirmes",
      value: stats.confirmed,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
    },
    {
      label: "A venir",
      value: stats.upcoming,
      icon: Clock,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/25",
    },
    {
      label: "Annules",
      value: stats.cancelled,
      icon: XCircle,
      gradient: "from-red-500 to-rose-500",
      shadow: "shadow-red-500/25",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-md ${card.shadow}`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[13px] text-slate-500">{card.label}</p>
              <p className="text-xl font-semibold text-slate-900">
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Appointment Dialog
// ---------------------------------------------------------------------------
function NewAppointmentDialog({
  onCreated,
}: {
  onCreated: (appointment: AppointmentItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [doctolibSlug, setDoctolibSlug] = useState("");
  const [doctolibResult, setDoctolibResult] = useState("");
  const [isCheckingDoctolib, setIsCheckingDoctolib] = useState(false);

  // Form fields
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [practitioner, setPractitioner] = useState("");
  const [motif, setMotif] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setPatientName("");
    setPatientPhone("");
    setPatientEmail("");
    setPractitioner("");
    setMotif("");
    setDate("");
    setDuration("30");
    setNotes("");
    setDoctolibSlug("");
    setDoctolibResult("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const appointment = await createAppointment({
          patientName,
          patientPhone,
          patientEmail: patientEmail || undefined,
          practitioner,
          motif,
          date,
          duration: parseInt(duration, 10) || 30,
          notes: notes || undefined,
          source: "manual",
        });
        onCreated(appointment);
        resetForm();
        setOpen(false);
      } catch (error) {
        console.error("Erreur lors de la creation du RDV:", error);
      }
    });
  }

  async function checkDoctolib() {
    if (!doctolibSlug.trim()) return;
    setIsCheckingDoctolib(true);
    setDoctolibResult("");
    try {
      const text = await fetchDoctolibAvailabilities(doctolibSlug.trim());
      setDoctolibResult(text);
    } catch (error) {
      setDoctolibResult(
        `Erreur: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsCheckingDoctolib(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-600">
            <Plus className="h-4 w-4" />
            Nouveau RDV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau rendez-vous</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="patientName" className="text-[13px]">
                <User className="h-3.5 w-3.5" />
                Nom du patient *
              </Label>
              <Input
                id="patientName"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patientPhone" className="text-[13px]">
                <Phone className="h-3.5 w-3.5" />
                Telephone *
              </Label>
              <Input
                id="patientPhone"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="patientEmail" className="text-[13px]">
              Email (optionnel)
            </Label>
            <Input
              id="patientEmail"
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="jean@example.com"
            />
          </div>

          {/* Practitioner & Motif */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="practitioner" className="text-[13px]">
                Praticien *
              </Label>
              <Input
                id="practitioner"
                value={practitioner}
                onChange={(e) => setPractitioner(e.target.value)}
                placeholder="Dr. Martin"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motif" className="text-[13px]">
                Motif *
              </Label>
              <Input
                id="motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Consultation generale"
                required
              />
            </div>
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-[13px]">
                <Calendar className="h-3.5 w-3.5" />
                Date et heure *
              </Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-[13px]">
                <Clock className="h-3.5 w-3.5" />
                Duree (min)
              </Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="240"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[13px]">
              Notes (optionnel)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes complementaires..."
              rows={2}
            />
          </div>

          {/* Doctolib Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <p className="text-[13px] font-medium text-slate-700">
              Disponibilites Doctolib
            </p>
            <div className="flex gap-2">
              <Input
                value={doctolibSlug}
                onChange={(e) => setDoctolibSlug(e.target.value)}
                placeholder="slug-du-praticien"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={checkDoctolib}
                disabled={isCheckingDoctolib || !doctolibSlug.trim()}
                className="gap-1.5 shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                {isCheckingDoctolib ? "Recherche..." : "Verifier"}
              </Button>
            </div>
            {doctolibResult && (
              <div className="rounded-lg bg-white border border-slate-200 p-3 text-[13px] text-slate-600 whitespace-pre-line max-h-40 overflow-y-auto">
                {doctolibResult}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
            >
              {isPending ? "Creation..." : "Creer le RDV"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
interface AppointmentsClientProps {
  initialAppointments: AppointmentItem[];
  initialStats: AppointmentStats;
}

export function AppointmentsClient({
  initialAppointments,
  initialStats,
}: AppointmentsClientProps) {
  const [appointments, setAppointments] =
    useState<AppointmentItem[]>(initialAppointments);
  const [stats, setStats] = useState<AppointmentStats>(initialStats);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCreated(appointment: AppointmentItem) {
    setAppointments((prev) =>
      [...prev, appointment].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    );
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      confirmed: prev.confirmed + 1,
      upcoming:
        new Date(appointment.date) > new Date()
          ? prev.upcoming + 1
          : prev.upcoming,
    }));
  }

  function handleStatusChange(id: string, newStatus: string) {
    startTransition(async () => {
      try {
        const updated = await updateAppointmentStatus(id, newStatus);
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? updated : a))
        );
        // Refresh stats locally
        const oldAppt = appointments.find((a) => a.id === id);
        if (oldAppt) {
          setStats((prev) => {
            const s = { ...prev };
            // Decrement old status
            if (oldAppt.status === "confirmed") s.confirmed--;
            if (oldAppt.status === "cancelled") s.cancelled--;
            if (oldAppt.status === "completed") s.completed--;
            if (oldAppt.status === "no_show") s.noShow--;
            // Increment new status
            if (newStatus === "confirmed") s.confirmed++;
            if (newStatus === "cancelled") s.cancelled++;
            if (newStatus === "completed") s.completed++;
            if (newStatus === "no_show") s.noShow++;
            // Recalculate upcoming
            const isUpcoming = new Date(oldAppt.date) > new Date();
            if (isUpcoming) {
              if (oldAppt.status === "confirmed" && newStatus !== "confirmed") {
                s.upcoming--;
              } else if (
                oldAppt.status !== "confirmed" &&
                newStatus === "confirmed"
              ) {
                s.upcoming++;
              }
            }
            return s;
          });
        }
      } catch (error) {
        console.error("Erreur lors du changement de statut:", error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce rendez-vous ?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteAppointment(id);
        const deleted = appointments.find((a) => a.id === id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        if (deleted) {
          setStats((prev) => {
            const s = { ...prev, total: prev.total - 1 };
            if (deleted.status === "confirmed") s.confirmed--;
            if (deleted.status === "cancelled") s.cancelled--;
            if (deleted.status === "completed") s.completed--;
            if (deleted.status === "no_show") s.noShow--;
            if (
              deleted.status === "confirmed" &&
              new Date(deleted.date) > new Date()
            ) {
              s.upcoming--;
            }
            return s;
          });
        }
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-slate-500">
            {appointments.length} rendez-vous
          </p>
        </div>
        <NewAppointmentDialog onCreated={handleCreated} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="text-[13px] font-medium text-slate-500">
                Patient
              </TableHead>
              <TableHead className="text-[13px] font-medium text-slate-500">
                Praticien
              </TableHead>
              <TableHead className="text-[13px] font-medium text-slate-500">
                Motif
              </TableHead>
              <TableHead className="text-[13px] font-medium text-slate-500">
                Date / Heure
              </TableHead>
              <TableHead className="text-[13px] font-medium text-slate-500">
                Statut
              </TableHead>
              <TableHead className="text-[13px] font-medium text-slate-500">
                Source
              </TableHead>
              <TableHead className="text-[13px] font-medium text-slate-500 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                      <Calendar className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-600">
                        Aucun rendez-vous
                      </p>
                      <p className="text-[13px] text-slate-400">
                        Les rendez-vous pris par vos agents IA apparaitront ici
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appt) => (
                <TableRow key={appt.id} className="group">
                  <TableCell>
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">
                        {appt.patientName}
                      </p>
                      <p className="text-[12px] text-slate-400">
                        {appt.patientPhone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-slate-600">
                    {appt.practitioner}
                  </TableCell>
                  <TableCell className="text-[13px] text-slate-600 max-w-[200px] truncate">
                    {appt.motif}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-[13px] text-slate-900">
                        {formatDateFR(appt.date)}
                      </p>
                      <p className="text-[12px] text-slate-400">
                        {appt.duration} min
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(appt.status)}`}
                    >
                      {statusLabel(appt.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[12px] text-slate-400">
                      {sourceLabel(appt.source)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {appt.status !== "confirmed" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            handleStatusChange(appt.id, "confirmed")
                          }
                          disabled={isPending}
                          title="Confirmer"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                      )}
                      {appt.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            handleStatusChange(appt.id, "cancelled")
                          }
                          disabled={isPending}
                          title="Annuler"
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                      {appt.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            handleStatusChange(appt.id, "completed")
                          }
                          disabled={isPending}
                          title="Marquer termine"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      )}
                      {appt.status !== "no_show" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            handleStatusChange(appt.id, "no_show")
                          }
                          disabled={isPending}
                          title="No-show"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(appt.id)}
                        disabled={isPending || deletingId === appt.id}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
