"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  X,
  Phone,
  Mail,
  Building2,
  Clock,
  MessageSquare,
  Tag,
  Send,
  Megaphone,
} from "lucide-react";
import {
  updateContact,
  deleteContact,
  addTagToContact,
  removeTagFromContact,
  addNoteToContact,
  getContactWithHistory,
} from "@/app/(dashboard)/contacts/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ContactData = Awaited<ReturnType<typeof getContactWithHistory>>;

interface NoteItem {
  text: string;
  author: string;
  createdAt: string;
}

interface ContactDetailClientProps {
  contact: ContactData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scoreBadge(score: number | null, label: string | null) {
  if (score === null && !label) return null;

  const l = (label || "").toLowerCase();
  if (l === "hot" || (score !== null && score >= 80)) {
    return (
      <Badge className="border-0 bg-red-50 text-red-600">
        Hot
      </Badge>
    );
  }
  if (l === "warm" || (score !== null && score >= 50)) {
    return (
      <Badge className="border-0 bg-amber-50 text-amber-600">
        Warm
      </Badge>
    );
  }
  return (
    <Badge className="border-0 bg-blue-50 text-blue-600">
      Cold
    </Badge>
  );
}

function formatDateTime(d: Date | string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const callStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-slate-100 text-slate-600" },
  in_progress: { label: "En cours", className: "bg-blue-50 text-blue-600" },
  completed: { label: "Terminé", className: "bg-emerald-50 text-emerald-600" },
  failed: { label: "Échoué", className: "bg-red-50 text-red-600" },
  no_answer: { label: "Sans réponse", className: "bg-amber-50 text-amber-600" },
};

const sentimentLabels: Record<string, { label: string; className: string }> = {
  positive: { label: "Positif", className: "bg-emerald-50 text-emerald-600" },
  neutral: { label: "Neutre", className: "bg-slate-100 text-slate-600" },
  negative: { label: "Négatif", className: "bg-red-50 text-red-600" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ContactDetailClient({ contact }: ContactDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Editable fields
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.email || "");
  const [company, setCompany] = useState(contact.company || "");
  const [isEditing, setIsEditing] = useState(false);

  // Tags
  const [newTag, setNewTag] = useState("");

  // Notes
  const [newNote, setNewNote] = useState("");
  const metadata = (contact.metadata as Record<string, unknown>) || {};
  const notes: NoteItem[] = Array.isArray(metadata.notes) ? (metadata.notes as NoteItem[]) : [];

  // Save edits
  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        await updateContact(contact.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          company: company.trim(),
        });
        setIsEditing(false);
        router.refresh();
      } catch (err) {
        console.error("Erreur mise à jour:", err);
      }
    });
  }, [contact.id, name, phone, email, company, router, startTransition]);

  // Delete
  const handleDelete = useCallback(() => {
    if (!confirm("Supprimer ce contact ? Cette action est irréversible.")) return;
    startTransition(async () => {
      try {
        await deleteContact(contact.id);
        router.push("/contacts");
      } catch (err) {
        console.error("Erreur suppression:", err);
      }
    });
  }, [contact.id, router, startTransition]);

  // Add tag
  const handleAddTag = useCallback(() => {
    const tag = newTag.trim();
    if (!tag) return;
    startTransition(async () => {
      try {
        await addTagToContact(contact.id, tag);
        setNewTag("");
        router.refresh();
      } catch (err) {
        console.error("Erreur ajout tag:", err);
      }
    });
  }, [contact.id, newTag, router, startTransition]);

  // Remove tag
  const handleRemoveTag = useCallback(
    (tag: string) => {
      startTransition(async () => {
        try {
          await removeTagFromContact(contact.id, tag);
          router.refresh();
        } catch (err) {
          console.error("Erreur suppression tag:", err);
        }
      });
    },
    [contact.id, router, startTransition]
  );

  // Add note
  const handleAddNote = useCallback(() => {
    const note = newNote.trim();
    if (!note) return;
    startTransition(async () => {
      try {
        await addNoteToContact(contact.id, note);
        setNewNote("");
        router.refresh();
      } catch (err) {
        console.error("Erreur ajout note:", err);
      }
    });
  }, [contact.id, newNote, router, startTransition]);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux contacts
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Contact info + Tags */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact info card */}
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                    {contact.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{contact.name}</h2>
                    {contact.company && (
                      <p className="text-sm text-slate-500">{contact.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {scoreBadge(contact.score, contact.scoreLabel)}
                </div>
              </div>

              {isEditing ? (
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">Nom</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">Téléphone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-slate-500">Entreprise</Label>
                    <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isPending}
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {isPending ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setName(contact.name);
                        setPhone(contact.phone);
                        setEmail(contact.email || "");
                        setCompany(contact.company || "");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {contact.phone}
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {contact.email}
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {contact.company}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Créé le {formatDateTime(contact.createdAt)}
                  </div>
                  {contact.campaign && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Megaphone className="h-4 w-4 text-slate-400" />
                      Campagne :{" "}
                      <Link
                        href={`/campaigns/${contact.campaign.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {contact.campaign.name}
                      </Link>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags card */}
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {contact.tags.length > 0 ? (
                  contact.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="border-0 bg-indigo-50 text-indigo-600 text-xs font-normal"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1.5 text-indigo-400 hover:text-indigo-700"
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Aucun tag</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nouveau tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={isPending || !newTag.trim()}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Notes + Call history */}
        <div className="space-y-6 lg:col-span-2">
          {/* Notes section */}
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare className="h-4 w-4" />
                Notes
              </h3>

              {/* Add note */}
              <div className="mb-4 flex gap-2">
                <Input
                  placeholder="Ajouter une note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={handleAddNote}
                  disabled={isPending || !newNote.trim()}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>

              {/* Notes list */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {[...notes].reverse().map((note, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-slate-50 px-4 py-3"
                    >
                      <p className="text-sm text-slate-700">{note.text}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                        <span>{note.author}</span>
                        <span>&middot;</span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucune note pour le moment.</p>
              )}
            </CardContent>
          </Card>

          {/* Call history */}
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Phone className="h-4 w-4" />
                Historique des appels ({contact.calls.length})
              </h3>

              {contact.calls.length > 0 ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
                        <TableHead className="text-xs font-medium text-slate-500">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">
                          Durée
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">
                          Statut
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">
                          Sentiment
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">
                          Résumé
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">
                          Campagne
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contact.calls.map((call) => {
                        const statusInfo = callStatusLabels[call.status] || callStatusLabels.pending;
                        const sentimentInfo = call.sentiment
                          ? sentimentLabels[call.sentiment.toLowerCase()] || null
                          : null;

                        return (
                          <TableRow key={call.id} className="border-slate-50">
                            <TableCell className="whitespace-nowrap text-sm text-slate-600">
                              {formatDateTime(call.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {formatDuration(call.duration)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`border-0 text-[11px] font-medium ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {sentimentInfo ? (
                                <Badge
                                  className={`border-0 text-[11px] font-medium ${sentimentInfo.className}`}
                                >
                                  {sentimentInfo.label}
                                </Badge>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs text-sm text-slate-600">
                              {call.summary ? (
                                <p className="line-clamp-2">{call.summary}</p>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {call.campaign ? (
                                <Link
                                  href={`/campaigns/${call.campaign.id}`}
                                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                                >
                                  <Megaphone className="h-3 w-3" />
                                  {call.campaign.name}
                                </Link>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucun appel enregistré.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact notes field (raw notes from contact model) */}
      {contact.notes && (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Notes générales
            </h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{contact.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
